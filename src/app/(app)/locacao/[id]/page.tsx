import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  TIPO_CONTA_LABEL,
  RESPONSAVEL_PAGAMENTO_LABEL,
  type TipoContaLocacao,
  type StatusContaLocacao,
  type ResponsavelPagamentoLocacao,
} from "@/lib/types";
import { alternarStatusConta, atualizarDetalhesConta, atualizarContrato } from "./actions";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const TIPOS: TipoContaLocacao[] = ["iptu", "condominio", "agua", "luz", "gas"];

const STATUS_STYLE: Record<StatusContaLocacao, string> = {
  pago: "bg-emerald-50 border-emerald-200 text-emerald-700",
  pendente: "bg-rose-50 border-rose-200 text-rose-700",
  nao_aplicavel: "bg-background border-border text-ink-muted/50",
};

const STATUS_SIMBOLO: Record<StatusContaLocacao, string> = {
  pago: "✓",
  pendente: "!",
  nao_aplicavel: "·",
};

export default async function ContratoLocacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { id } = await params;
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) || new Date().getFullYear();

  const supabase = await createClient();

  const { data: contrato } = await supabase
    .from("contratos_locacao")
    .select(
      `*, imoveis ( endereco ),
       locador:clientes!contratos_locacao_locador_id_fkey ( nome, telefone, email ),
       locatario:clientes!contratos_locacao_locatario_id_fkey ( nome, telefone, email )`
    )
    .eq("id", id)
    .single();

  if (!contrato) notFound();

  const { data: clientes } = await supabase.from("clientes").select("id, nome").order("nome");

  type Contrato = typeof contrato & {
    imoveis: { endereco: string } | null;
    locador: { nome: string; telefone: string | null; email: string | null } | null;
    locatario: { nome: string; telefone: string | null; email: string | null } | null;
  };
  const c = contrato as unknown as Contrato;

  const RESPONSAVEL_POR_TIPO: Record<TipoContaLocacao, ResponsavelPagamentoLocacao | null> = {
    iptu: c.responsavel_iptu,
    condominio: c.responsavel_condominio,
    agua: c.responsavel_agua,
    luz: c.responsavel_luz,
    gas: c.responsavel_gas,
  };

  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-01`;

  const { data: contasRaw } = await supabase
    .from("contas_locacao")
    .select("*")
    .eq("contrato_id", id)
    .gte("competencia", inicioAno)
    .lte("competencia", fimAno);

  const contasPorChave = new Map((contasRaw ?? []).map((cc) => [`${cc.tipo}-${cc.competencia}`, cc]));

  const contasComDados = (contasRaw ?? []).filter((cc) => cc.status !== "nao_aplicavel");

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="font-mono text-xs text-ink-muted">{c.numero}</p>
        <h1 className="mt-1 text-xl font-serif font-bold uppercase tracking-wide text-ink">
          {c.imoveis?.endereco ?? "Sem imóvel definido"}
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink-muted sm:grid-cols-3">
          <Info label="Locador" value={c.locador?.nome} />
          <Info label="Telefone" value={c.locador?.telefone} />
          <Info label="Locatário" value={c.locatario?.nome} />
          <Info label="Telefone" value={c.locatario?.telefone} />
          <Info label="Emite NF" value={c.emite_nf ? "Sim" : "Não"} />
          <Info label="Status" value={c.ativo ? "Ativo" : "Encerrado"} />
        </div>
      </div>

      {/* Grid de contas */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Contas — {ano}</h2>
          <div className="flex gap-1 text-xs">
            <a
              href={`/locacao/${id}?ano=${ano - 1}`}
              className="rounded-md border border-border px-2 py-1 text-ink-muted hover:bg-background"
            >
              ← {ano - 1}
            </a>
            <a
              href={`/locacao/${id}?ano=${ano + 1}`}
              className="rounded-md border border-border px-2 py-1 text-ink-muted hover:bg-background"
            >
              {ano + 1} →
            </a>
          </div>
        </div>

        <p className="mb-3 text-xs text-ink-muted">
          Clique numa célula pra alternar: sem informação → pendente → pago → sem informação.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-background text-left text-ink-muted">
                <th className="px-3 py-2 font-medium">Conta</th>
                {MESES.map((m) => (
                  <th key={m} className="px-1.5 py-2 text-center font-medium">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TIPOS.map((tipo) => {
                const responsavel = RESPONSAVEL_POR_TIPO[tipo];
                return (
                <tr key={tipo}>
                  <td className="px-3 py-2 font-medium text-ink">
                    {TIPO_CONTA_LABEL[tipo]}
                    {responsavel && (
                      <span className="ml-1.5 rounded border border-border bg-background px-1 py-0.5 text-[9px] font-normal uppercase tracking-wide text-ink-muted">
                        {RESPONSAVEL_PAGAMENTO_LABEL[responsavel]}
                      </span>
                    )}
                  </td>
                  {MESES.map((_, mesIdx) => {
                    const competencia = `${ano}-${String(mesIdx + 1).padStart(2, "0")}-01`;
                    const conta = contasPorChave.get(`${tipo}-${competencia}`);
                    const status = (conta?.status ?? "nao_aplicavel") as StatusContaLocacao;
                    return (
                      <td key={mesIdx} className="px-1 py-1.5 text-center">
                        <form action={alternarStatusConta}>
                          <input type="hidden" name="contrato_id" value={id} />
                          <input type="hidden" name="tipo" value={tipo} />
                          <input type="hidden" name="competencia" value={competencia} />
                          <input type="hidden" name="status_atual" value={status} />
                          {conta && <input type="hidden" name="conta_id" value={conta.id} />}
                          <button
                            type="submit"
                            title={`${TIPO_CONTA_LABEL[tipo]} — ${MESES[mesIdx]}/${ano}`}
                            className={`flex h-6 w-6 items-center justify-center rounded border text-[10px] font-medium ${STATUS_STYLE[status]}`}
                          >
                            {STATUS_SIMBOLO[status]}
                          </button>
                        </form>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalhes editáveis (valor/vencimento) das contas com status definido */}
      {contasComDados.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Valores e vencimentos</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Conta</th>
                  <th className="px-4 py-2.5 font-medium">Mês</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Vencimento</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contasComDados
                  .sort((a, b) => a.competencia.localeCompare(b.competencia))
                  .map((cc) => (
                    <tr key={cc.id}>
                      <td className="px-4 py-2 text-ink">{TIPO_CONTA_LABEL[cc.tipo as TipoContaLocacao]}</td>
                      <td className="px-4 py-2 text-ink-muted">
                        {new Date(cc.competencia + "T00:00:00").toLocaleDateString("pt-BR", {
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[cc.status as StatusContaLocacao]}`}
                        >
                          {cc.status === "pago" ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <form action={atualizarDetalhesConta} className="flex items-center gap-1.5">
                          <input type="hidden" name="conta_id" value={cc.id} />
                          <input type="hidden" name="contrato_id" value={id} />
                          <span className="text-xs text-ink-muted">R$</span>
                          <input
                            name="valor"
                            type="number"
                            step="0.01"
                            defaultValue={cc.valor ?? ""}
                            className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                          />
                          <input
                            name="vencimento"
                            type="date"
                            defaultValue={cc.vencimento ?? ""}
                            className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-background"
                          >
                            Salvar
                          </button>
                        </form>
                      </td>
                      <td />
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dados do contrato */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Dados do contrato</h2>
        <form action={atualizarContrato} className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <input type="hidden" name="id" value={id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Número</label>
              <input
                name="numero"
                defaultValue={c.numero}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input type="checkbox" name="ativo" defaultChecked={c.ativo} className="accent-brand" />
              Contrato ativo
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Locador</label>
              <select
                name="locador_id"
                defaultValue={contrato.locador_id ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">—</option>
                {(clientes ?? []).map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Locatário</label>
              <select
                name="locatario_id"
                defaultValue={contrato.locatario_id ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">—</option>
                {(clientes ?? []).map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Inscrição IPTU/TLP
              </label>
              <input
                name="iptu_inscricao"
                defaultValue={c.iptu_inscricao ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo de IPTU</label>
              <select
                name="iptu_tipo"
                defaultValue={c.iptu_tipo ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">—</option>
                <option value="parcelado">Parcelado</option>
                <option value="cota_unica">Cota única</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input type="checkbox" name="emite_nf" defaultChecked={c.emite_nf} className="accent-brand" />
              Emite NF
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Administradora do condomínio
              </label>
              <input
                name="condominio_administradora"
                defaultValue={c.condominio_administradora ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Contato do condomínio
              </label>
              <input
                name="condominio_contato"
                defaultValue={c.condominio_contato ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Inscrição de água
              </label>
              <input
                name="agua_inscricao"
                defaultValue={c.agua_inscricao ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Código do cliente (água)
              </label>
              <input
                name="agua_codigo_cliente"
                defaultValue={c.agua_codigo_cliente ?? ""}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Quem paga cada conta neste contrato
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResponsavelSelect label="IPTU / TLP" name="responsavel_iptu" value={c.responsavel_iptu} />
              <ResponsavelSelect
                label="Condomínio"
                name="responsavel_condominio"
                value={c.responsavel_condominio}
              />
              <ResponsavelSelect label="Água" name="responsavel_agua" value={c.responsavel_agua} />
              <ResponsavelSelect label="Luz" name="responsavel_luz" value={c.responsavel_luz} />
              <ResponsavelSelect label="Gás" name="responsavel_gas" value={c.responsavel_gas} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
            <textarea
              name="observacoes"
              defaultValue={c.observacoes ?? ""}
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Salvar contrato
          </button>
        </form>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-ink-muted">{label}: </span>
      <span className="text-ink">{value}</span>
    </p>
  );
}

function ResponsavelSelect({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: ResponsavelPagamentoLocacao | null;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      >
        <option value="">—</option>
        <option value="locador">Locador</option>
        <option value="locatario">Locatário</option>
      </select>
    </div>
  );
}
