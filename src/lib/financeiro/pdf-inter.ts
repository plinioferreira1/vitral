/**
 * Leitor conservador dos PDFs do Banco Inter (formatos homologados com extrato
 * ago–nov/2026 e fatura out/2026). Sem OCR, sem envio para serviço externo.
 * Antes da gravação a UI exige conferência humana dos valores.
 */
export type MovimentoInter = {
  data: string;
  descricao: string;
  valorCentavos: number;
  saldoAposCentavos: number;
  pagamentoFatura: boolean;
};
export type CompraInter = {
  data: string;
  estabelecimento: string;
  valorCentavos: number;
  parcelaAtual: number;
  parcelaTotal: number;
  finalCartao: string;
};
export type ExtratoInter = {
  tipo: "extrato";
  movimentos: MovimentoInter[];
  inicio: string;
  fim: string;
  saldoFinalCentavos: number;
  divergencias: number;
};
export type FaturaInter = {
  tipo: "fatura";
  compras: CompraInter[];
  vencimento: string;
  competencia: string;
  totalCentavos: number;
  confere: boolean;
};

const MESES: Record<string, number> = {
  janeiro:1, fevereiro:2, marco:3, abril:4, maio:5, junho:6,
  julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12,
  jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12,
};
function dataInter(dia: string, mes: string, ano: string) {
  const mm=MESES[mes.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\.$/,"")];
  return mm ? [ano,String(mm).padStart(2,"0"),String(dia).padStart(2,"0")].join("-") : "";
}
function centavosInter(texto: string): number {
  const m=/(-?)\s*R\$\s*([\d.]+,\d{2})/.exec(texto);
  return m ? (m[1]==="-"?-1:1)*Number(m[2].replace(/\./g,"").replace(",","")) : NaN;
}
type PDFItem = {str?:string;transform?:number[]};
type PDFJs = {
  GlobalWorkerOptions:{workerSrc:string};
  getDocument:(op:{data:Uint8Array})=>{promise:Promise<{
    numPages:number;getPage:(n:number)=>Promise<{
      getTextContent:()=>Promise<{items:PDFItem[]}>;cleanup:()=>void
    }>;
    destroy:()=>Promise<void>;
  }>};
};
/** A versão PDF.js fica fixa; somente o código da biblioteca vem do CDN. */
export async function extrairLinhasPDF(arquivo: File): Promise<string[]> {
  if(arquivo.size===0||arquivo.size>4*1024*1024) throw new Error("Escolha um PDF de até 4 MB.");
  if(!/\.pdf$/i.test(arquivo.name)&&arquivo.type!=="application/pdf")throw new Error("O arquivo deve ser PDF.");
  const url="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs";
  const worker="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs";
  let pdfjs:PDFJs;
  try {
    // @ts-ignore: importação nativa no navegador de módulo público versionado.
    pdfjs=await import(/* webpackIgnore: true */ url) as PDFJs;
  }catch{throw new Error("Não foi possível carregar o leitor de PDF. Verifique sua conexão.");}
  pdfjs.GlobalWorkerOptions.workerSrc=worker;
  let pdf:Awaited<ReturnType<ReturnType<PDFJs["getDocument"]>["promise"]["then"]>> | undefined;
  // A API é dinâmica e a tipagem é normalizada localmente, sem usar Node no cliente.
  const documento=await pdfjs.getDocument({data:new Uint8Array(await arquivo.arrayBuffer())}).promise;
  try {
    if(documento.numPages>40)throw new Error("Limite de 40 páginas por PDF.");
    const linhas:string[]=[];
    for(let n=1;n<=documento.numPages;n++){
      const pagina=await documento.getPage(n);
      const conteudo=await pagina.getTextContent();
      const grupos=new Map<number,{x:number;text:string}[]>();
      for(const item of conteudo.items){
        if(!item.str?.trim()||!item.transform)continue;
        const y=Math.round(item.transform[5]/3)*3;
        const conjunto=grupos.get(y)||[];
        conjunto.push({x:item.transform[4],text:item.str.trim()});
        grupos.set(y,conjunto);
      }
      for(const [,itens] of [...grupos.entries()].sort((a,b)=>b[0]-a[0])){
        const linha=itens.sort((a,b)=>a.x-b.x).map(t=>t.text).join(" ").replace(/\s+/g," ").trim();
        if(linha)linhas.push(linha);
      }
      pagina.cleanup();
    }
    if(!linhas.length)throw new Error("PDF sem texto selecionável. Para PDF digitalizado, utilize OFX ou CSV.");
    return linhas;
  }finally{await documento.destroy();}
}

export function interpretarExtratoInter(linhas:string[]):ExtratoInter {
  if(!linhas.some(t=>/Banco Inter|Saldo por transa[cç][aã]o/i.test(t)))
    throw new Error("O formato de extrato PDF deste banco ainda não foi homologado.");
  const movimentos:MovimentoInter[]=[];
  let dia="";
  for(const linha of linhas){
    const cab=/(\d{1,2}) de ([A-Za-zÀ-ÿ]+) de (20\d{2})\s+Saldo do dia/i.exec(linha);
    if(cab)dia=dataInter(cab[1],cab[2],cab[3]);
    if(!dia)continue;
    const m=/^(.+?)\s+(-?R\$\s*[\d.]+,\d{2})\s+(-?R\$\s*[\d.]+,\d{2})\s*$/i.exec(linha);
    if(!m||!/^(Pix |Pagamento |Transfer[eê]ncia |DARF |Tarifa |Cr[eé]dito |D[eé]bito )/i.test(m[1]))continue;
    const valor=centavosInter(m[2]),saldoApos=centavosInter(m[3]);
    if(!Number.isSafeInteger(valor)||!Number.isSafeInteger(saldoApos)||valor===0)continue;
    movimentos.push({data:dia,descricao:m[1].trim(),valorCentavos:valor,saldoAposCentavos:saldoApos,
      pagamentoFatura:/fatura.*cart[aã]o.*inter|debito automatico fatura/i.test(m[1])});
  }
  if(!movimentos.length)throw new Error("Nenhuma movimentação foi reconhecida neste extrato.");
  let divergencias=0;
  for(let i=1;i<movimentos.length;i++){
    if(movimentos[i-1].saldoAposCentavos+movimentos[i].valorCentavos!==movimentos[i].saldoAposCentavos)divergencias++;
  }
  return {tipo:"extrato",movimentos,inicio:movimentos[0].data,
    fim:movimentos[movimentos.length-1].data,
    saldoFinalCentavos:movimentos[movimentos.length-1].saldoAposCentavos,divergencias};
}

export function interpretarFaturaInter(linhas:string[]):FaturaInter {
  if(!linhas.some(l=>/Despesas da fatura/i.test(l))||!linhas.some(l=>/CART[AÃ]O\s+\d{4}\*+/i.test(l)))
    throw new Error("O formato de fatura PDF deste banco ainda não foi homologado.");
  let finalCartao="",vencimento="",totalCentavos=NaN;
  const compras:CompraInter[]=[];
  for(const linha of linhas){
    const cab=/^CART[AÃ]O\s+(\d{4}\*{4}(\d{4}))/i.exec(linha);
    if(cab)finalCartao=cab[2];
    const geral=/\b(\d{2})\/(\d{2})\/(20\d{2})\s+R\$\s*([\d.]+,\d{2})\b/.exec(linha);
    if(geral&&!vencimento){vencimento=geral[3]+"-"+geral[2]+"-"+geral[1];totalCentavos=centavosInter("R$ "+geral[4]);}
    const m=/^(\d{1,2}) de ([a-zçà-ÿ]{3,})\.?\s+(20\d{2})\s+(.+)$/i.exec(linha);
    if(!m||!finalCartao)continue;
    const data=dataInter(m[1],m[2],m[3]);
    const v=/(?:\+\s*)?R\$\s*([\d.]+,\d{2})\s*$/.exec(m[4]);
    if(!v||!data)continue;
    const estabelecimento=m[4].slice(0,v.index).replace(/\s+-\s*$/,"").trim();
    if(/^(PAGTO|PAGAMENTO|ESTORNO|CR[EÉ]DITO)/i.test(estabelecimento))continue;
    const parc=/\(\s*Parcela\s+(\d+)\s+de\s+(\d+)\s*\)/i.exec(estabelecimento);
    const valor=centavosInter("R$ "+v[1]);
    if(!Number.isSafeInteger(valor)||valor<=0)continue;
    compras.push({data,estabelecimento,valorCentavos:valor,
      parcelaAtual:parc?Number(parc[1]):1,
      parcelaTotal:parc?Number(parc[2]):1,
      finalCartao});
  }
  if(!compras.length)throw new Error("Nenhuma compra identificada.");
  const soma=compras.reduce((s,c)=>s+c.valorCentavos,0);
  return {tipo:"fatura",compras,vencimento,competencia:vencimento.slice(0,7),
    totalCentavos,confere:Number.isFinite(totalCentavos)&&soma===totalCentavos};
}
