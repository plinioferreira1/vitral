"use client";

import { useMemo, useState } from "react";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoEnviar } from "@/components/botao-enviar";
import { criarPlanoComissao, salvarComissao } from "./actions";
import { ChevronDown, Plus, Users, CalendarDays, Wallet, CircleCheck, AlertCircle } from "lucide-react";

export type RegistroComissao = {
  id: string;
  beneficiario_id: string | null;
  tipo_beneficiario: string;
  beneficiario_nome: string | null;
  valor_previsto: number | null;
  valor_recebido: number | null;
  data_recebida: string | null;
  data_prevista: string | null;
  status: string;
  observacoes: string | null;
  grupo_rateio: string | null;
  parcela_numero: number | null;
  parcela_total: number | null;
  corretores: { nome: string } | null;
};

type Corretor = { id: string; nome: string; usuario_id?: string | null };
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalizar = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
const dataBR = (data: string | null) => data ? data.split("-").reverse().join("/") : "Sem previsão";
const nomeValido = (nome: string) => nome.trim().length >= 3 && /[aeiouáéíóúâêôãõ]/i.test(nome);

function adicionarMeses(data: string, meses: number) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-").map(Number);
  const primeiro = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const fim = new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + 1, 0)).getUTCDate();
  primeiro.setUTCDate(Math.min(dia, fim));
  return primeiro.toISOString().slice(0, 10);
}

function nomeRegistro(c: RegistroComissao) {
  if (c.tipo_beneficiario === "sacra") return "SACRA";
  if (c.tipo_beneficiario === "parceria") return "Parceria (histórico)";
  if (c.tipo_beneficiario === "externo") return c.beneficiario_nome || "Beneficiário externo";
  return c.corretores?.nome || "Beneficiário não identificado";
}

const statusClass = (s: string) => s === "100% pago"
  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
  : s === "cancelada" ? "bg-rose-50 text-rose-800 border-rose-200"
  : s === "50% pago" ? "bg-amber-50 text-amber-800 border-amber-200"
  : "bg-background text-ink-muted border-border";

function EditarLancamento({ registro, processoId }: { registro: RegistroComissao; processoId: string }) {
  return <details className="group rounded-lg border border-border/70 bg-surface">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-sm text-ink">
          {registro.parcela_numero && registro.parcela_total
            ? `Parcela ${registro.parcela_numero}/${registro.parcela_total}`
            : "Lançamento anterior"}
        </span>
        <span className="text-xs text-ink-muted"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{dataBR(registro.data_prevista)}</span>
        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusClass(registro.status)}`}>{registro.status}</span>
      </div>
      <div className="flex items-center gap-2">
        <strong className="text-sm tabular-nums text-ink">{moeda(Number(registro.valor_previsto ?? 0))}</strong>
        <ChevronDown className="h-4 w-4 text-ink-muted transition group-open:rotate-180"/>
      </div>
    </summary>
    <form action={salvarComissao} className="grid gap-3 border-t border-border bg-background/50 p-4 sm:grid-cols-2">
      <input type="hidden" name="processo_id" value={processoId} />
      <input type="hidden" name="comissao_id" value={registro.id} />
      <input type="hidden" name="destinatario_rateio" value={registro.tipo_beneficiario === "corretor" ? registro.beneficiario_id ?? "" : registro.tipo_beneficiario} />
      {registro.tipo_beneficiario === "externo" && <input type="hidden" name="beneficiario_externo" value={registro.beneficiario_nome ?? ""} />}
      <label className="block text-xs font-medium text-ink-muted">Valor desta parcela
        <CampoMoeda name="valor_previsto" defaultValue={Number(registro.valor_previsto ?? 0)} />
      </label>
      <label className="block text-xs font-medium text-ink-muted">Previsão de pagamento
        <input type="date" name="data_prevista" defaultValue={registro.data_prevista ?? ""}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink" />
      </label>
      <label className="block text-xs font-medium text-ink-muted">Situação
        <select name="status" defaultValue={registro.status} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink">
          <option value="0% pago">A receber</option>
          <option value="50% pago">50% pago (legado)</option>
          <option value="100% pago">Pago integralmente</option>
          <option value="cancelada">Cancelado</option>
        </select>
      </label>
      <div className="space-y-3 rounded-lg border border-border bg-surface p-3 sm:col-span-2">
        <p className="text-xs font-semibold text-ink">Recebimento efetivo</p>
        <p className="text-xs text-ink-muted">Informe os dados reais ao marcar um pagamento como quitado. Editar outras informações não altera automaticamente um recebimento existente.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-muted">Valor recebido (R$)
            <CampoMoeda name="valor_recebido" defaultValue={registro.valor_recebido ?? 0} />
          </label>
          <label className="block text-xs font-medium text-ink-muted">Data real do recebimento
            <input type="date" name="data_recebida" defaultValue={registro.data_recebida ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink"/>
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs text-ink-muted">
          <input type="checkbox" name="confirmar_retificacao" value="sim" className="mt-0.5 h-4 w-4 shrink-0 accent-brand"/>
          Confirmo que estou corrigindo um recebimento já registrado (inclusive reversão de quitação).
        </label>
      </div>
      <label className="block text-xs font-medium text-ink-muted sm:col-span-2">Observações
        <textarea name="observacoes" rows={2} defaultValue={registro.observacoes ?? ""} maxLength={500}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
      </label>
      <div className="sm:col-span-2">
        <BotaoEnviar className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Salvar alterações</BotaoEnviar>
      </div>
    </form>
  </details>;
}

export function ComissoesVenda({ processoId, registros, corretores, envolvidos }: {
  processoId: string;
  registros: RegistroComissao[];
  corretores: Corretor[];
  envolvidos: string[];
}) {
  const [abrirNovo, setAbrirNovo] = useState(registros.length === 0);
  const [destinatario, setDestinatario] = useState("");
  const [busca, setBusca] = useState("");
  const [valorTotal, setValorTotal] = useState(0);
  const [quantidade, setQuantidade] = useState(1);
  const [primeiraData, setPrimeiraData] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const opcoes = useMemo(() => {
    const ids = new Set<string>();
    const nomes = new Set<string>();
    return [...corretores].sort((a,b) => Number(envolvidos.includes(b.id)) - Number(envolvidos.includes(a.id))).filter(c => {
      if (!nomeValido(c.nome)) return false;
      const chave = c.usuario_id ? "u:" + c.usuario_id : "n:" + normalizar(c.nome);
      const alias = normalizar(c.nome);
      if (ids.has(chave) || nomes.has(alias)) return false;
      ids.add(chave); nomes.add(alias); return true;
    }).sort((a,b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [corretores, envolvidos]);
  const prioritarios = opcoes.filter(c => envolvidos.includes(c.id));
  const restantes = opcoes.filter(c => !envolvidos.includes(c.id));
  const filtrados = (lista: Corretor[]) => lista.filter(c => !busca || normalizar(c.nome).includes(normalizar(busca)) || c.id === destinatario);

  const ativos = registros.filter(c => c.status !== "cancelada");
  const grupos = useMemo(() => {
    const mapa = new Map<string, { chave: string; nome: string; itens: RegistroComissao[]; total: number }>();
    registros.forEach(registro => {
      const nome = nomeRegistro(registro);
      const chave = registro.tipo_beneficiario === "corretor"
        ? "corretor:" + normalizar(nome)
        : registro.tipo_beneficiario === "externo" ? "externo:" + normalizar(nome)
        : registro.tipo_beneficiario;
      const grupo = mapa.get(chave) ?? { chave, nome, itens: [], total: 0 };
      grupo.itens.push(registro);
      if (registro.status !== "cancelada") grupo.total += Number(registro.valor_previsto ?? 0);
      mapa.set(chave, grupo);
    });
    return [...mapa.values()].sort((a,b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [registros]);

  const centavos = Math.round(valorTotal * 100);
  const valores = Array.from({ length: quantidade }, (_, i) => (Math.floor(centavos / quantidade) + (i < centavos % quantidade ? 1 : 0)) / 100);
  const classInput = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-background/60 p-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted"><Wallet className="h-4 w-4"/> Total distribuído</div>
        <p className="mt-2 text-xl font-bold tabular-nums text-brand">{moeda(ativos.reduce((s,c)=>s+Number(c.valor_previsto??0),0))}</p>
      </div>
      <div className="rounded-xl border border-border bg-background/60 p-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted"><Users className="h-4 w-4"/> Beneficiários</div>
        <p className="mt-2 text-xl font-bold tabular-nums text-ink">{grupos.filter(g=>g.total>0).length}</p>
      </div>
      <div className="rounded-xl border border-border bg-background/60 p-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted"><CircleCheck className="h-4 w-4"/> Pagamentos registrados</div>
        <p className="mt-2 text-xl font-bold tabular-nums text-ink">{ativos.filter(c=>c.status==="100% pago").length} <span className="text-sm font-normal text-ink-muted">de {ativos.length}</span></p>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-base font-semibold text-ink">Distribuição e parcelas</h3>
        <p className="mt-0.5 text-xs text-ink-muted">Um beneficiário pode ter vários pagamentos. Cada parcela tem seu próprio vencimento e status.</p>
      </div>
      <button type="button" onClick={()=>setAbrirNovo(v=>!v)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        <Plus className="h-4 w-4"/> Novo rateio
      </button>
    </div>
    {abrirNovo && <section className="rounded-2xl border border-brand/30 bg-brand-soft/20 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div><h4 className="font-semibold text-ink">Adicionar participação</h4>
        <p className="mt-1 text-xs text-ink-muted">Defina quem recebe e como será pago. O parcelamento é lançado em uma única operação.</p></div>
        <button type="button" onClick={()=>setAbrirNovo(false)} className="text-xs font-medium text-ink-muted underline">Fechar</button>
      </div>
      <form action={criarPlanoComissao} className="space-y-4">
        <input type="hidden" name="processo_id" value={processoId}/>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-muted">Buscar corretor
            <input value={busca} onChange={e=>setBusca(e.target.value)}
              placeholder="Pesquisar pelo nome (opcional)" className={classInput}/>
          </label>
          <label className="block text-xs font-medium text-ink-muted">Beneficiário
            <select name="destinatario_rateio" required value={destinatario} onChange={e=>setDestinatario(e.target.value)} className={classInput}>
              <option value="">Selecione o beneficiário</option>
              <optgroup label="Empresa e parceiros">
                <option value="sacra">SACRA</option>
                <option value="externo">Outro beneficiário / parceiro</option>
              </optgroup>
              {prioritarios.length > 0 && <optgroup label="Participantes desta venda">
                {filtrados(prioritarios).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </optgroup>}
              {filtrados(restantes).length > 0 && <optgroup label="Outros corretores cadastrados">
                {filtrados(restantes).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </optgroup>}
            </select>
          </label>
          {destinatario==="externo" && <label className="block text-xs font-medium text-ink-muted sm:col-span-2">Nome do beneficiário / empresa
            <input name="beneficiario_externo" required minLength={2} maxLength={120}
              placeholder="Nome completo ou razão social" className={classInput}/>
          </label>}
          <label className="block text-xs font-medium text-ink-muted">Valor total desta participação
            <CampoMoeda name="valor_total" onValorChange={setValorTotal} />
          </label>
          <label className="block text-xs font-medium text-ink-muted">Forma de pagamento
            <select value={quantidade===1?"vista":"parcelado"} onChange={e=>setQuantidade(e.target.value==="vista"?1:2)} className={classInput}>
              <option value="vista">À vista — uma parcela</option>
              <option value="parcelado">Parcelado</option>
            </select>
          </label>
          {quantidade>1 && <label className="block text-xs font-medium text-ink-muted">Quantidade de parcelas
            <input type="number" min={2} max={24} value={quantidade} onChange={e=>setQuantidade(Math.max(2,Math.min(24,Number(e.target.value)||2)))} className={classInput}/>
          </label>}
          <label className="block text-xs font-medium text-ink-muted">Primeiro vencimento
            <input type="date" value={primeiraData} onChange={e=>setPrimeiraData(e.target.value)} className={classInput} required={quantidade>1}/>
          </label>
        </div>
        <input type="hidden" name="quantidade_parcelas" value={quantidade}/>
        {valorTotal>0 && <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-ink">Cronograma de pagamento</h5>
            <span className="text-xs text-ink-muted">{quantidade===1?"À vista":`${quantidade} parcelas editáveis`}</span>
          </div>
          <div className="space-y-3">
            {valores.map((v,i)=><div key={i} className="grid items-end gap-2 rounded-lg bg-background/70 p-3 sm:grid-cols-[100px_1fr_1fr]">
              <span className="pb-2 text-xs font-semibold text-ink-muted">{quantidade===1?"Pagamento":`Parcela ${i+1}`}</span>
              <label className="block text-xs font-medium text-ink-muted">Valor
                <CampoMoeda key={`${quantidade}-${centavos}-${i}`} name="parcela_valor" defaultValue={v}/>
              </label>
              <label className="block text-xs font-medium text-ink-muted">Previsão
                <input key={`d-${primeiraData}-${i}`} name="parcela_data" type="date" defaultValue={adicionarMeses(primeiraData,i)}
                  required={quantidade>1} className={classInput}/>
              </label>
            </div>)}
          </div>
        </div>}
        <label className="block text-xs font-medium text-ink-muted">Observação geral (opcional)
          <textarea name="observacoes" maxLength={500} value={observacoes} onChange={e=>setObservacoes(e.target.value)}
            placeholder="Ex.: primeira parcela na assinatura, segunda na escritura" rows={2} className={classInput}/>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <p className="text-xs text-ink-muted">A distribuição não cria lançamentos financeiros adicionais.</p>
          <BotaoEnviar className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Salvar rateio e parcelas</BotaoEnviar>
        </div>
      </form>
    </section>}
    {grupos.length===0 ? <div className="rounded-xl border border-dashed border-border bg-background/50 p-7 text-center">
      <AlertCircle className="mx-auto mb-2 h-5 w-5 text-ink-muted"/>
      <p className="text-sm font-medium text-ink">Nenhuma comissão distribuída</p>
      <p className="mt-1 text-xs text-ink-muted">Use “Novo rateio” para adicionar o primeiro beneficiário.</p>
    </div> : <div className="space-y-3">
      {grupos.map(grupo=><details key={grupo.chave} className="group overflow-hidden rounded-xl border border-border bg-surface" open={grupos.length<=3}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{grupo.nome.slice(0,1).toUpperCase()}</span>
            <span><strong className="block text-sm text-ink">{grupo.nome}</strong>
              <span className="text-xs text-ink-muted">{grupo.itens.length} {grupo.itens.length===1?"lançamento":"lançamentos"} · {grupo.itens.filter(c=>c.status!=="cancelada"&&c.status!=="100% pago").length} em aberto</span>
            </span>
          </div>
          <div className="flex items-center gap-2"><strong className="tabular-nums text-brand">{moeda(grupo.total)}</strong><ChevronDown className="h-4 w-4 text-ink-muted transition group-open:rotate-180"/></div>
        </summary>
        <div className="space-y-2 border-t border-border bg-background/30 p-3 sm:p-4">
          {grupo.itens.map(registro=><EditarLancamento key={registro.id} registro={registro} processoId={processoId}/>)}
          {grupo.itens.some(c=>!c.parcela_numero) && <p className="pt-1 text-xs text-ink-muted">Os lançamentos anteriores não tinham numeração de parcelas; seus dados foram mantidos.</p>}
        </div>
      </details>)}
    </div>}
  </div>;
}
