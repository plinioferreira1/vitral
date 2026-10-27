import Link from "next/link";
import { FileUp, Landmark } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { saldoEmAberto } from "@/lib/financeiro/baixa";
import type { LancamentoAberto } from "@/lib/financeiro/extrato";
import { baixasParaMovimento, movimentoPorConta } from "@/lib/saldos";
import { importarOFX } from "./actions";
import { ListaExtrato, type LinhaTela } from "./lista-extrato";

const STATUS = [
  { valor: "pendente", rotulo: "A conciliar" },
  { valor: "conciliado", rotulo: "Conciliadas" },
  { valor: "ignorado", rotulo: "Deixadas de fora" },
] as const;

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
const nomeMes = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const centavos = (v: number | string) => Math.round(Number(v) * 100);

export default async function ExtratosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: contas }, { data: comLinhas }] = await Promise.all([
    supabase.from("financeiro_contas_bancarias").select("id, nome, ativa, saldo_inicial").order("nome"),
    supabase.from("financeiro_extrato_linhas").select("conta_bancaria_id").limit(1),
  ]);
  const ativas = (contas ?? []).filter((c) => c.ativa);
  const contaId = ativas.find((c) => c.id === sp.conta)?.id ?? comLinhas?.[0]?.conta_bancaria_id ?? ativas[0]?.id;
  const conta = (contas ?? []).find((c) => c.id === contaId);
  const status = STATUS.find((s) => s.valor === sp.status)?.valor ?? "pendente";
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : "";

  if (!conta) {
    return (
      <div className="financeiro-ui w-full min-w-0 space-y-5">
        <CabecalhoPagina titulo="Extratos e conciliação" descricao="Cadastre uma conta bancária para importar extratos." />
      </div>
    );
  }

  let consultaLinhas = supabase
    .from("financeiro_extrato_linhas")
    .select("id, data, valor, descricao, status, nota, lancamento_criado_id")
    .eq("conta_bancaria_id", conta.id)
    .eq("status", status)
    .order("data")
    .order("criado_em")
    .limit(1000);
  if (mes) {
    const [a, m] = mes.split("-").map(Number);
    const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
    consultaLinhas = consultaLinhas.gte("data", `${mes}-01`).lte("data", fim);
  }

  const [
    { data: linhas },
    { data: resumo },
    { data: importacoes },
    { data: baixasConta },
    { data: transferencias },
    { data: abertosBrutos },
    { data: categorias },
    { data: unidades },
  ] = await Promise.all([
    consultaLinhas,
    supabase.from("financeiro_extrato_linhas").select("status, data").eq("conta_bancaria_id", conta.id).limit(10000),
    supabase
      .from("financeiro_extrato_importacoes")
      .select("arquivo_nome, saldo_final, saldo_data, criado_em")
      .eq("conta_bancaria_id", conta.id)
      .order("saldo_data", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .limit(5),
    supabase.from("financeiro_baixas").select("conta_bancaria_id, valor, data, financeiro_lancamentos(tipo)").eq("conta_bancaria_id", conta.id),
    supabase
      .from("financeiro_transferencias")
      .select("conta_origem_id, conta_destino_id, valor, data")
      .or(`conta_origem_id.eq.${conta.id},conta_destino_id.eq.${conta.id}`),
    supabase
      .from("financeiro_lancamentos")
      .select("id, tipo, descricao, valor, vencimento, financeiro_pessoas(nome), financeiro_baixas(valor)")
      .in("status", ["pendente", "pago_parcial"])
      .order("vencimento")
      .limit(3000),
    supabase.from("financeiro_categorias").select("id, nome, tipo").order("nome"),
    supabase.from("financeiro_unidades").select("id, nome").order("nome"),
  ]);

  // O que cada linha tratada gerou (para mostrar ao lado dela).
  const idsTratados = (linhas ?? []).filter((l) => l.status === "conciliado").map((l) => l.id);
  const [{ data: vinculosBaixa }, { data: vinculosTransf }] = idsTratados.length
    ? await Promise.all([
        supabase.from("financeiro_baixas").select("extrato_linha_id, financeiro_lancamentos(descricao)").in("extrato_linha_id", idsTratados),
        supabase.from("financeiro_transferencias").select("extrato_linha_id, conta_origem_id, conta_destino_id").in("extrato_linha_id", idsTratados),
      ])
    : [{ data: [] }, { data: [] }];
  const nomeConta = new Map((contas ?? []).map((c) => [c.id, c.nome]));
  const vinculos = new Map<string, string[]>();
  for (const b of vinculosBaixa ?? []) {
    if (!b.extrato_linha_id) continue;
    const desc = (b.financeiro_lancamentos as { descricao?: string } | null)?.descricao ?? "lançamento";
    vinculos.set(b.extrato_linha_id, [...(vinculos.get(b.extrato_linha_id) ?? []), desc]);
  }
  for (const t of vinculosTransf ?? []) {
    if (!t.extrato_linha_id) continue;
    const outra = t.conta_origem_id === conta.id ? t.conta_destino_id : t.conta_origem_id;
    vinculos.set(t.extrato_linha_id, [...(vinculos.get(t.extrato_linha_id) ?? []), `Transferência com ${nomeConta.get(outra) ?? "outra conta"}`]);
  }

  const contagem = { pendente: 0, conciliado: 0, ignorado: 0 } as Record<string, number>;
  const meses = new Set<string>();
  for (const r of resumo ?? []) {
    contagem[r.status] = (contagem[r.status] ?? 0) + 1;
    meses.add(r.data.slice(0, 7));
  }

  // Saldo do banco (último extrato) x saldo do Vitral na mesma data.
  const ultimo = (importacoes ?? []).find((i) => i.saldo_final !== null && i.saldo_data);
  const saldoVitral = (ate?: string) =>
    centavos(conta.saldo_inicial ?? 0) +
    centavos(movimentoPorConta(baixasParaMovimento(baixasConta), transferencias ?? [], ate).get(conta.id) ?? 0);
  const banco = ultimo ? centavos(ultimo.saldo_final!) : null;
  const vitral = ultimo ? saldoVitral(ultimo.saldo_data!) : saldoVitral();

  const abertos: LancamentoAberto[] = (abertosBrutos ?? [])
    .map((l) => ({
      id: l.id,
      tipo: l.tipo,
      descricao: l.descricao,
      pessoa: (l.financeiro_pessoas as { nome?: string } | null)?.nome ?? null,
      vencimento: l.vencimento,
      saldoCentavos: centavos(saldoEmAberto(Number(l.valor), (l.financeiro_baixas as { valor: number }[] | null) ?? [])),
    }))
    .filter((l) => l.saldoCentavos > 0);

  const linhasTela: LinhaTela[] = (linhas ?? []).map((l) => ({
    id: l.id,
    data: l.data,
    valorCentavos: centavos(l.valor),
    descricao: l.descricao,
    status: l.status,
    nota: l.nota,
    vinculos: vinculos.get(l.id) ?? [],
  }));

  const link = (p: Record<string, string>) => {
    const q = new URLSearchParams({ conta: conta.id, status, ...(mes ? { mes } : {}), ...p });
    for (const [k, v] of [...q]) if (!v) q.delete(k);
    return `/financeiro/extratos?${q}`;
  };

  return (
    <div className="financeiro-ui w-full min-w-0 space-y-5">
      <CabecalhoPagina
        titulo="Extratos e conciliação"
        descricao="Cada movimento do banco fica aqui até alguém confirmar o que ele é: um lançamento que já existe, um novo lançamento, uma transferência entre contas ou algo que fica de fora. Nada vira lançamento sozinho."
      />

      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Conta</span>
            <select name="conta" defaultValue={conta.id} className={`${INPUT_CLASS} w-auto min-w-56`}>
              {ativas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Mês</span>
            <select name="mes" defaultValue={mes} className={`${INPUT_CLASS} w-auto min-w-44`}>
              <option value="">Todos</option>
              {[...meses].sort().reverse().map((m) => (
                <option key={m} value={m}>{nomeMes(m)}</option>
              ))}
            </select>
          </label>
          <input type="hidden" name="status" value={status} />
          <button className="min-h-11 rounded-lg border border-border/80 px-3.5 text-sm font-medium text-ink-muted hover:bg-background">Mostrar</button>
        </form>
      </div>

      <section className={`${CARD_CLASS} grid gap-4 p-5 sm:grid-cols-3`}>
        <div>
          <p className="text-xs font-medium text-ink-muted">Saldo no banco{ultimo ? ` em ${dataBR(ultimo.saldo_data!)}` : ""}</p>
          <p className="num mt-1 text-xl font-bold text-ink">{banco === null ? "—" : brl(banco)}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{ultimo ? `Do extrato ${ultimo.arquivo_nome ?? "importado"}` : "Nenhum extrato importado ainda"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-muted">Saldo no Vitral{ultimo ? " na mesma data" : ""}</p>
          <p className="num mt-1 text-xl font-bold text-ink">{brl(vitral)}</p>
          <p className="mt-0.5 text-xs text-ink-muted">Saldo inicial + baixas + transferências</p>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-muted">Diferença</p>
          <p className={`num mt-1 text-xl font-bold ${banco !== null && banco !== vitral ? "text-amber-700" : "text-emerald-700"}`}>
            {banco === null ? "—" : banco === vitral ? "Fechado" : brl(banco - vitral)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {contagem.pendente ? `${contagem.pendente} linha(s) a conciliar` : "Nenhuma linha pendente"}
          </p>
        </div>
      </section>

      <nav aria-label="Situação das linhas" className="flex gap-2 overflow-x-auto pb-1">
        {STATUS.map((s) => (
          <Link
            key={s.valor}
            href={link({ status: s.valor })}
            className={`min-h-11 shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium ${
              s.valor === status ? "border-brand bg-brand text-white" : "border-border/80 text-ink-muted hover:bg-background"
            }`}
          >
            {s.rotulo} <span className="num opacity-80">{contagem[s.valor] ?? 0}</span>
          </Link>
        ))}
      </nav>

      <ListaExtrato
        linhas={linhasTela}
        abertos={abertos}
        categorias={categorias ?? []}
        unidades={unidades ?? []}
        outrasContas={ativas.filter((c) => c.id !== conta.id).map((c) => ({ id: c.id, nome: c.nome }))}
        status={status}
      />

      <details className={`${CARD_CLASS} p-5`}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <FileUp size={16} /> Importar extrato (OFX)
        </summary>
        <form action={importarOFX} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Conta</span>
            <select name="conta_id" defaultValue={conta.id} className={INPUT_CLASS}>
              {ativas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Arquivo .ofx</span>
            <input name="arquivo" type="file" accept=".ofx,.OFX,application/x-ofx" required className={INPUT_CLASS} />
          </label>
          <BotaoEnviar className={PRIMARY_BUTTON_CLASS}>Importar</BotaoEnviar>
          <p className="text-xs leading-5 text-ink-muted sm:col-span-3">
            No app ou internet banking, exporte o extrato no formato OFX. Linhas que já estão no sistema são puladas, então pode importar períodos que se repetem.
            Extratos em PDF: envie para o Claude carregar.
          </p>
        </form>
      </details>

      {(importacoes ?? []).length > 0 && (
        <section className="text-xs text-ink-muted">
          <p className="mb-1 flex items-center gap-1.5 font-medium"><Landmark size={13} /> Últimas importações desta conta</p>
          <ul className="space-y-0.5">
            {(importacoes ?? []).map((i, n) => (
              <li key={n}>
                {i.arquivo_nome ?? "Extrato"} · importado em {new Date(i.criado_em).toLocaleDateString("pt-BR")}
                {i.saldo_final !== null && i.saldo_data ? ` · saldo ${brl(centavos(i.saldo_final))} em ${dataBR(i.saldo_data)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
