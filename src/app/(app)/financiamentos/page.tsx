import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { ResumoPrazos } from "@/components/resumo-prazos";
import { CalendarioGrid } from "@/components/calendario-grid";
import { TabelaProcessos, type ProcessoRow } from "@/components/tabela-processos";
import { hojeISO } from "@/lib/data-br";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarProcessosSelecionados } from "../processos/bulk-actions";

type Aba = "resumo" | "andamento" | "processos";

const CHECKLIST_COMPRADORES = [
  "Documento com foto (RG, CNH, CIN, etc)",
  "Certidões de Nada Consta",
  "Comprovante de Endereço",
  "Comprovante de Estado Civil",
  "Consulta Cadastral SICAQ/CAIXA AQUI",
  "Consulta Cadastral CADMUT/CIWEB",
  "Comprovante de Renda (Contracheque, IRPF, etc)",
  "Formulário de Cadastro SICAQ/CAIXA AQUI",
  "Formulário Cliente Habitação MO30844",
  "Dossiê Habitacional MO30825",
  "Caso o cliente vá abrir Conta Corrente, incluir também a proposta de adesão",
];

const CHECKLIST_VENDEDORES = [
  "Documento com foto (RG, CNH, CIN, etc)",
  "Certidões de Nada Consta",
  "Comprovante de Endereço",
  "Comprovante de Estado Civil",
  "Consulta Cadastral SICAQ/CAIXA AQUI",
];

const CHECKLIST_IMOVEL = ["Certidão de Ônus", "Ficha Cadastral junto ao GDF"];

export default async function FinanciamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaParam } = await searchParams;
  const aba: Aba =
    abaParam === "andamento" ? "andamento" : abaParam === "processos" ? "processos" : "resumo";

  const supabase = await createClient();

  const { data: processos, error } = await supabase
    .from("processos")
    .select(
      `id, numero_processo, tipo, status, data_criacao, valor_total, valor_financiado, origem,
       imoveis ( endereco ),
       comprador:clientes!processos_comprador_id_fkey ( nome ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome ),
       corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ),
       indicacao:corretores!processos_indicacao_id_fkey ( nome ),
       modelos_processo ( nome )`
    )
    .eq("categoria", "financiamento")
    .order("criado_em", { ascending: false });

  if (error) {
    return <p className="text-sm text-rose-700">Erro ao carregar processos: {error.message}</p>;
  }

  const rows = (processos ?? []) as unknown as ProcessoRow[];
  const emAndamento = rows.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const concluidos = rows.filter((p) => p.status === "concluido" || p.status === "cancelado");

  const eventos = (await getEventosCalendario()).filter((e) => e.categoria === "financiamento");
  const referencia = new Date(`${hojeISO()}T00:00:00`);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Financiamentos</h1>
          <p className="mt-1 text-sm text-ink-muted">{rows.length} processos nessa categoria</p>
        </div>
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
      </div>

      {aba === "resumo" ? (
        <div className="space-y-6">
          <ResumoPrazos eventos={eventos} hrefEmAberto="/calendario?categoria=financiamento" />
          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Calendário</p>
              <Link
                href="/calendario?categoria=financiamento"
                className="text-xs font-medium text-brand hover:underline"
              >
                Abrir calendário completo →
              </Link>
            </div>
            <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
          </div>
        </div>
      ) : aba === "andamento" ? (
        <form action={apagarProcessosSelecionados} className="space-y-6">
          {(emAndamento.length > 0 || concluidos.length > 0) && (
            <div className="flex justify-end">
              <BotaoComConfirmacao
                mensagem="Apagar os processos selecionados? Essa ação não pode ser desfeita."
                className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Apagar selecionados
              </BotaoComConfirmacao>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
            {emAndamento.length === 0 && concluidos.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-muted">
                Nenhum processo nessa categoria ainda.{" "}
                <Link href="/processos/novo" className="text-brand hover:underline">
                  Criar o primeiro
                </Link>
                .
              </p>
            ) : (
              <TabelaProcessos rows={emAndamento} ehFinanciamento={true} />
            )}
          </div>

          {concluidos.length > 0 && (
            <details className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-ink-muted hover:text-ink">
                {concluidos.length} processo{concluidos.length > 1 ? "s" : ""} concluído
                {concluidos.length > 1 ? "s" : ""} ou cancelado{concluidos.length > 1 ? "s" : ""}
              </summary>
              <div className="border-t border-border">
                <TabelaProcessos rows={concluidos} ehFinanciamento={true} />
              </div>
            </details>
          )}
        </form>
      ) : (
        <div className="max-w-2xl space-y-6">
          <p className="text-sm text-ink-muted">
            Checklist de documentação pra abertura e conformidade do processo de financiamento.
            Reúna esses itens antes de enviar pro correspondente/banco.
          </p>

          <ChecklistConformidade titulo="Compradores" itens={CHECKLIST_COMPRADORES} />
          <p className="-mt-4 text-xs text-ink-muted">
            Essa checklist vale pra cada proponente comprador, exceto os formulários — que são
            assinados por todos os proponentes juntos.
          </p>

          <ChecklistConformidade titulo="Vendedores" itens={CHECKLIST_VENDEDORES} />
          <p className="-mt-4 text-xs text-ink-muted">Essa checklist vale pra cada vendedor.</p>

          <ChecklistConformidade titulo="Imóvel" itens={CHECKLIST_IMOVEL} />
        </div>
      )}
    </div>
  );
}

function ChecklistConformidade({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-ink">{titulo}</p>
      <ul className="space-y-2">
        {itens.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] text-ink-muted">
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
