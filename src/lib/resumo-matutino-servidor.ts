import { createAdminClient } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/data-br";
import { baixasParaMovimento, movimentoPorConta } from "@/lib/saldos";
import { montarResumoProcessos, type EtapaResumo, type ProcessoResumo } from "@/lib/resumo-processos";
import type { ItemDemandaMatutina, ItemFinanceiroMatutino, ItemVendaMatutina, ResumoMatutino } from "@/lib/resumo-matutino";

type LinhaFinanceira = ItemFinanceiroMatutino & { status: string };
type LinhaBaixa = { lancamento_id: string; valor: number; conta_bancaria_id: string | null; data: string; financeiro_lancamentos: { tipo: string } | null };
type LinhaConta = { id: string; saldo_inicial: number; ativa: boolean };
type LinhaTransferencia = { conta_origem_id: string; conta_destino_id: string; valor: number; data: string };
type LinhaProcesso = { id: string; numero_processo: string; categoria: string; data_final_contrato: string | null; imoveis: { endereco: string | null } | null };
type LinhaEtapa = { id: string; nome: string; data_prevista: string; processo_id: string; usuarios: { nome: string } | null };
type LinhaDemanda = ItemDemandaMatutina & { status: string };

const somarDias = (data: string, dias: number) => {
  const d = new Date(data + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** Consulta somente leitura: cada destinatário recebe apenas as suas demandas e seus lembretes. */
export async function carregarResumoMatutino(tenantId: string, usuarioId: string, nome: string): Promise<ResumoMatutino> {
  const db = createAdminClient();
  const dia = hojeISO();
  const [
    contas, baixas, transferencias, pendentes,
    tarefas, vendas, processos
  ] = await Promise.all([
    db.from("financeiro_contas_bancarias").select("id,saldo_inicial,ativa").eq("tenant_id",tenantId).eq("ativa",true),
    db.from("financeiro_baixas").select("lancamento_id,valor,conta_bancaria_id,data,financeiro_lancamentos!inner(tipo,tenant_id)").eq("tenant_id",tenantId),
    db.from("financeiro_transferencias").select("conta_origem_id,conta_destino_id,valor,data").eq("tenant_id",tenantId),
    db.from("financeiro_lancamentos").select("id,tipo,descricao,valor,vencimento,status")
      .eq("tenant_id",tenantId).in("status",["pendente","pago_parcial"]).lte("vencimento",dia).order("vencimento").limit(500),
    db.from("demandas").select("id,titulo,prazo,prioridade,status")
      .eq("tenant_id",tenantId).eq("responsavel_id",usuarioId).is("excluida_em",null)
      .neq("status","concluida").order("prazo",{ascending:true,nullsFirst:false}).limit(500),
    db.from("vendas_lembretes").select("processo_id,titulo,mensagem,criado_em")
      .eq("tenant_id",tenantId).eq("usuario_id",usuarioId).gte("criado_em",dia+"T03:00:00Z")
      .order("criado_em",{ascending:false}).limit(30),
    db.from("processos").select("id,numero_processo,categoria,data_final_contrato,imoveis(endereco)")
      .eq("tenant_id",tenantId).eq("status","ativo").limit(500)
  ]);
  const idsProcessos=(processos.data??[]).map(p=>p.id);
  const etapas=idsProcessos.length
    ? await db.from("etapas").select("id,nome,data_prevista,processo_id,usuarios(nome)")
      .in("processo_id",idsProcessos).in("status",["pendente","em_andamento"])
      .not("data_prevista","is",null).lte("data_prevista",somarDias(dia,7)).limit(1000)
    : {data:[],error:null};
  const erro = [contas,baixas,transferencias,pendentes,tarefas,vendas,processos,etapas].find(r=>r.error)?.error;
  if(erro) throw new Error("Não foi possível montar o resumo diário.");
  if((pendentes.data?.length ?? 0)>=500 || (tarefas.data?.length ?? 0)>=500 || (processos.data?.length ?? 0)>=500 || (etapas.data?.length ?? 0)>=1000)
    throw new Error("Há muitos itens para a prévia. A consulta precisa ser paginada.");

  const bankAccounts = (contas.data ?? []) as unknown as LinhaConta[];
  const pagamentos = (baixas.data ?? []) as unknown as LinhaBaixa[];
  const transfer = (transferencias.data ?? []) as unknown as LinhaTransferencia[];
  const movimentos = movimentoPorConta(baixasParaMovimento(pagamentos),transfer);
  const saldo = bankAccounts.reduce((total,c)=>total+Number(c.saldo_inicial)+(movimentos.get(c.id)??0),0);
  const baixasPorLancamento = new Map<string,number>();
  for(const b of pagamentos) baixasPorLancamento.set(b.lancamento_id,(baixasPorLancamento.get(b.lancamento_id)??0)+Number(b.valor));
  const titulos = (pendentes.data ?? []) as unknown as LinhaFinanceira[];
  const pendencias = titulos.map(t=>({...t, valor:Math.max(0,Math.round((Number(t.valor)-(baixasPorLancamento.get(t.id)??0))*100)/100)}))
    .filter(t=>t.valor>0);
  const vencidos = pendencias.filter(t=>t.vencimento<dia);
  const vencemHoje = pendencias.filter(t=>t.vencimento===dia);

  const demandas = (tarefas.data ?? []) as unknown as LinhaDemanda[];
  const processosRaw = (processos.data ?? []) as unknown as LinhaProcesso[];
  const etapasRaw = (etapas.data ?? []) as unknown as LinhaEtapa[];
  const ids = new Set(processosRaw.map(p=>p.id));
  const processosResumo: ProcessoResumo[] = processosRaw.map(p=>({
    id:p.id,numero_processo:p.numero_processo,categoria:p.categoria,
    endereco:p.imoveis?.endereco??null,data_final_contrato:p.data_final_contrato
  }));
  const etapasResumo: EtapaResumo[] = etapasRaw.filter(e=>ids.has(e.processo_id)).map(e=>({
    id:e.id,nome:e.nome,data_prevista:e.data_prevista,processo_id:e.processo_id,
    responsavel:e.usuarios?.nome??null
  }));
  return {
    dia,nome,
    financeiro:{
      saldo:bankAccounts.length ? Math.round(saldo*100)/100 : null,
      pagarHoje:vencemHoje.filter(t=>t.tipo==="despesa"),
      receberHoje:vencemHoje.filter(t=>t.tipo==="receita"),
      vencidos
    },
    demandas:{
      hoje:demandas.filter(t=>t.prazo===dia),
      vencidas:demandas.filter(t=>t.prazo!==null && t.prazo<dia),
      outras:demandas.filter(t=>!t.prazo || t.prazo>dia)
    },
    processos:montarResumoProcessos(processosResumo,etapasResumo,dia),
    vendas:(vendas.data??[]) as unknown as ItemVendaMatutina[]
  };
}
