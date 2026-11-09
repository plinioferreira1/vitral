import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Processo = {
  status: string | null;
  fonte_lead: string | null;
  data_venda: string | null;
  mes_venda: string | null;
  data_conclusao: string | null;
  data_assinatura: string | null;
  data_criacao: string | null;
  valor_total: number | null;
};
type Historico = { fonte_lead: string | null; mes_venda: string };
type Custo = { canal: string; mes: string; valor: number };
type Canal = { nome: string; vendas: number; custo: number; mesesInformados: number; custoConhecido: boolean; meses: Set<string> };
const C = {
  verde: rgb(0.055, 0.243, 0.204),
  verdeClaro: rgb(0.85, 0.92, 0.89),
  verdeMedio: rgb(0.24, 0.49, 0.42),
  escuro: rgb(0.12, 0.17, 0.17),
  cinza: rgb(0.43, 0.49, 0.48),
  claro: rgb(0.96, 0.97, 0.96),
  linha: rgb(0.86, 0.89, 0.87),
  dourado: rgb(0.76, 0.59, 0.32),
  branco: rgb(1, 1, 1),
};
const BRL = (n: number) => new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL",maximumFractionDigits:2}).format(n);
const clean = (s: string) => s.replace(/[^\u0020-\u00ff]/g, " ").replace(/\s+/g, " ").trim();
const periodo = (p: Processo) => p.mes_venda || p.data_venda?.slice(0,7) || p.data_conclusao?.slice(0,7) || p.data_assinatura?.slice(0,7) || p.data_criacao?.slice(0,7) || "";
const realizado = (p: Processo) => p.status === "concluido" || Boolean(p.mes_venda || p.data_venda);
const nome = (s: string | null) => s?.trim() || "Não informado";

export async function GET(request: NextRequest) {
  const {usuario}=await getUsuarioAtual();
  if(!usuario?.tenant_id || !["diretor","gerente"].includes(usuario.nivel_acesso)) return new NextResponse("Sem permissão.",{status:403});
  const ano=request.nextUrl.searchParams.get("ano") || "2026";
  if(!/^20[0-9]{2}$/.test(ano)) return new NextResponse("Ano inválido.",{status:400});
  const canalFiltro=request.nextUrl.searchParams.get("canal") || "";
  const db=await createClient();
  const [pr,hr,cr]=await Promise.all([
    db.from("processos").select("status,fonte_lead,mes_venda,data_venda,data_conclusao,data_assinatura,data_criacao,valor_total").eq("tenant_id",usuario.tenant_id).eq("categoria","venda"),
    db.from("vendas_fontes_historicas").select("fonte_lead,mes_venda").eq("tenant_id",usuario.tenant_id),
    db.from("vendas_investimentos_canais").select("canal,mes,valor").eq("tenant_id",usuario.tenant_id).gte("mes",ano+"-01").lte("mes",ano+"-12"),
  ]);
  if(pr.error || hr.error || cr.error) return new NextResponse("Erro ao consultar dados do relatório.",{status:500});
  const ps=(pr.data??[]) as Processo[], hs=(hr.data??[]) as Historico[], cs=(cr.data??[]) as Custo[];
  const anoP=ps.filter(p=>periodo(p).startsWith(ano));
  const pendentes=anoP.filter(p=>!realizado(p)).length;
  const realizados=anoP.filter(realizado).filter(p=>!canalFiltro || nome(p.fonte_lead)===canalFiltro);
  const historicos=hs.filter(h=>h.mes_venda.startsWith(ano)).filter(h=>!canalFiltro || nome(h.fonte_lead)===canalFiltro);
  const despesas=cs.filter(c=>!canalFiltro || c.canal===canalFiltro);
  const mapa=new Map<string,Canal>();
  const get=(n:string):Canal=>{
    const existe=mapa.get(n);if(existe)return existe;
    const novo:Canal={nome:n,vendas:0,custo:0,mesesInformados:0,custoConhecido:false,meses:new Set()};
    mapa.set(n,novo);return novo;
  };
  const meses=Array.from({length:12},(_,i)=>ano+"-"+String(i+1).padStart(2,"0"));
  const porMes=new Map(meses.map(m=>[m,0]));
  for(const p of realizados){const r=get(nome(p.fonte_lead));r.vendas++;const m=periodo(p);if(porMes.has(m))porMes.set(m,(porMes.get(m)||0)+1);}
  for(const h of historicos){get(nome(h.fonte_lead)).vendas++;if(porMes.has(h.mes_venda))porMes.set(h.mes_venda,(porMes.get(h.mes_venda)||0)+1);}
  for(const c of despesas){const r=get(c.canal);r.custo+=Number(c.valor);r.custoConhecido=true;r.meses.add(c.mes);}
  const canais=[...mapa.values()].map(r=>({...r,mesesInformados:r.meses.size}))
    .sort((a,b)=>b.vendas-a.vendas||b.custo-a.custo);
  const nVendas=realizados.length+historicos.length;
  const nSemFonte=realizados.filter(p=>!p.fonte_lead||p.fonte_lead==="Indefinido").length+historicos.filter(h=>!h.fonte_lead||h.fonte_lead==="Indefinido").length;
  const custoTotal=despesas.reduce((s,d)=>s+Number(d.valor),0);
  const canaisSemCusto=canais.filter(c=>c.vendas>0&&!c.custoConhecido).length;

  const pdf=await PDFDocument.create();
  pdf.setTitle("VITRAL | Fontes de leads e eficiência de portais - "+ano);
  pdf.setAuthor("Sacra Netimóveis | VITRAL");
  pdf.setSubject("Relatório gerencial de vendas por canal, investimentos e custo por venda");
  const normal=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const W=595.28,H=841.89,M=42;
  const page=()=>{const p=pdf.addPage([W,H]);p.drawRectangle({x:0,y:H-11,width:W,height:11,color:C.verde});return p;};
  const txt=(p:PDFPage,s:string,x:number,y:number,size=10,font:PDFFont=normal,color=C.escuro,maxWidth=0)=>{
    let v=clean(s);
    if(maxWidth>0){while(v.length>1&&font.widthOfTextAtSize(v,size)>maxWidth)v=v.slice(0,-2).trimEnd()+"…";}
    p.drawText(v,{x,y,size,font,color});return v;
  };
  const line=(p:PDFPage,y:number)=>p.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:0.7,color:C.linha});
  const header=(p:PDFPage,sec:string,number:number)=>{
    txt(p,"VITRAL  /  SACRA NETIMÓVEIS",M,H-47,9,bold,C.verde);
    txt(p,sec,M,H-71,19,bold,C.escuro);
    txt(p,"RELATÓRIO GERENCIAL  ·  "+ano,W-201,H-47,8,normal,C.cinza);
    line(p,H-85);
    txt(p,"Gerado em "+new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date()),M,29,8,normal,C.cinza);
    txt(p,"VITRAL   •   "+number,W-106,29,8,normal,C.cinza);
  };
  const card=(p:PDFPage,x:number,y:number,w:number,title:string,value:string,caption:string)=>{
    p.drawRectangle({x,y,width:w,height:87,color:C.claro,borderColor:C.linha,borderWidth:0.5});
    txt(p,title,x+13,y+66,8,bold,C.cinza,w-26);
    txt(p,value,x+13,y+38,21,bold,C.verde,w-25);
    txt(p,caption,x+13,y+17,8,normal,C.cinza,w-25);
  };
  const p1=page();header(p1,"Fontes de leads e desempenho comercial",1);
  txt(p1,"Panorama consolidado dos processos e vendas históricas cadastrados",M,H-111,9,normal,C.cinza);
  const cw=(W-2*M-20)/3;
  card(p1,M,598,cw,"VENDAS REGISTRADAS",String(nVendas),"Somente fechadas/com mês informado");
  card(p1,M+cw+10,598,cw,"CUSTO CADASTRADO",BRL(custoTotal),"Valores informados por canal");
  card(p1,M+2*(cw+10),598,cw,"SEM FONTE",String(nSemFonte),"Vendas a classificar");
  txt(p1,"PARTICIPAÇÃO DOS CANAIS NAS VENDAS",M,569,11,bold,C.escuro);
  txt(p1,"Cada barra representa vendas associadas ao canal.",M,553,8,normal,C.cinza);
  const top=canais.filter(c=>c.vendas>0).slice(0,10);
  const max=Math.max(1,...top.map(x=>x.vendas));
  let y=526;
  for(const c of top){
    txt(p1,c.nome,M,y,9,normal,C.escuro,150);
    p1.drawRectangle({x:M+158,y:y-2,width:291,height:12,color:C.claro});
    p1.drawRectangle({x:M+158,y:y-2,width:291*c.vendas/max,height:12,color:C.verdeMedio});
    txt(p1,String(c.vendas),W-M-27,y,9,bold,C.escuro);
    y-=27;
  }
  if(top.length===0)txt(p1,"Nenhuma venda realizada cadastrada para o período.",M,y,10,normal,C.cinza);
  const chartY=160;
  txt(p1,"EVOLUÇÃO MENSAL DE VENDAS",M,chartY+88,11,bold,C.escuro);
  const maxM=Math.max(1,...porMes.values());
  meses.forEach((mes,i)=>{
    const x=M+i*42.1;
    const q=porMes.get(mes)||0;
    p1.drawRectangle({x,y:chartY,width:25,height:54,color:C.claro});
    if(q) p1.drawRectangle({x,y:chartY,width:25,height:54*q/maxM,color:C.dourado});
    txt(p1,mes.slice(5),x+3,chartY-14,8,normal,C.cinza);
    if(q)txt(p1,String(q),x+8,chartY+58*q/maxM,7,bold,C.escuro);
  });
  line(p1,125);
  txt(p1,"Atenção: existem "+pendentes+" processos não concluídos no ano selecionado; eles não entram",M,108,8,normal,C.cinza);
  txt(p1,ano==="2026" ? "no total de vendas realizadas. Referência de 63 operações informada pela gestão, sujeita à conciliação." : "no total de vendas realizadas. Confira as fontes e custos antes de tomar decisões.",M,95,8,normal,C.cinza);

  const p2=page();header(p2,"Comparativo de investimento e eficiência",2);
  txt(p2,"CUSTO POR VENDA = INVESTIMENTO REGISTRADO / VENDAS REALIZADAS",M,720,10,bold,C.verde);
  txt(p2,"Sem cadastro de custo não significa que o portal seja gratuito.",M,701,9,normal,C.cinza);
  txt(p2,"Canal",M,663,9,bold,C.escuro);
  txt(p2,"Vendas",M+203,663,9,bold,C.escuro);
  txt(p2,"Investimento",M+262,663,9,bold,C.escuro);
  txt(p2,"Custo/venda",M+375,663,9,bold,C.escuro);
  line(p2,653);
  let ty=631;
  const metricas=canais.filter(c=>c.nome!=="Não informado");
  for(const c of metricas.slice(0,17)){
    if(ty<155)break;
    txt(p2,c.nome,M,ty,9,normal,C.escuro,194);
    txt(p2,String(c.vendas),M+210,ty,9,bold,C.escuro);
    txt(p2,c.custoConhecido?BRL(c.custo):"N/I",M+262,ty,9,normal,C.escuro,108);
    txt(p2,c.custoConhecido&&c.vendas?BRL(c.custo/c.vendas):"N/I",M+376,ty,9,bold,C.verde,130);
    line(p2,ty-13);
    ty-=28;
  }
  const boxY=110;
  p2.drawRectangle({x:M,y:boxY,width:W-2*M,height:88,color:C.claro});
  txt(p2,"LEITURA DOS RESULTADOS",M+12,boxY+66,9,bold,C.verde);
  txt(p2,"Custo por venda é indicador parcial quando faltam despesas ou vendas lançadas.",M+12,boxY+48,8,normal,C.escuro);
  txt(p2,"Canais com vendas e nenhum custo informado: "+canaisSemCusto+".",M+12,boxY+31,8,normal,C.escuro);
  txt(p2,"Não representa ROI: lucro/comissão líquida e atribuição completa não foram apurados.",M+12,boxY+14,8,normal,C.escuro);

  const p3=page();header(p3,"Metodologia e decisões",3);
  const sec=(t:string,body:string[],start:number)=>{
    txt(p3,t,M,start,12,bold,C.verde);
    let yy=start-21;
    for(const b of body){txt(p3,b,M,yy,9,normal,C.escuro,W-2*M);yy-=16;}
    return yy-25;
  };
  let ry=721;
  ry=sec("1. Qual é o canal de maior volume?",[
    "Compare a quantidade de vendas por origem, não apenas o número de leads.",
    "Vendas históricas e processos realizados são somados uma vez no relatório."
  ],ry);
  ry=sec("2. Qual portal tem menor custo por venda?",[
    "Registre cada investimento mensal em Vendas > Fontes de leads > Investimentos.",
    "O custo é dividido pelo número de vendas atribuídas ao canal no ano.",
    "Meses sem lançamento permanecem sem comprovação; não são tratados como zero."
  ],ry);
  ry=sec("3. Como interpretar o melhor custo-benefício?",[
    "Analise volume, custo por venda, período de contrato e cobertura dos dados.",
    "Para medir ROI real, ainda será necessário cadastrar comissões líquidas,",
    "receita atribuída ao canal e despesas completas."
  ],ry);
  ry=sec("4. Qualidade e conciliação",[
    ano==="2026" ? "A referência de 63 operações da gestão exige comparação com os cadastros." : "A base deste relatório exige conferência dos cadastros.",
    "Processos em andamento sem mês comercial confirmado não contam como venda.",
    "O período usa mês informado; na ausência dele, utiliza as datas disponíveis.",
    "A fonte 'Indefinido' não é considerada origem identificada."
  ],ry);
  txt(p3,"Nota gerencial: este documento reflete os registros disponíveis na geração.",M,165,9,bold,C.escuro);
  txt(p3,"Recomendação: atualizar custos e fontes mensalmente antes de cada reunião.",M,147,9,normal,C.cinza);

  const bytes=await pdf.save();
  return new NextResponse(new Uint8Array(bytes),{
    headers:{
      "Content-Type":"application/pdf",
      "Content-Disposition":'attachment; filename="vitral-fontes-leads-'+ano+'.pdf"',
      "Cache-Control":"private, no-store"
    }
  });
}
