import Link from "next/link";
import type { ReactNode } from "react";
import { Paperclip, Repeat } from "lucide-react";
import { SelecionarTodos } from "@/components/selecionar-todos";
import { MenuAcoesLancamento } from "./menu-acoes-lancamento";

export type EstadoExibicao = "vencido" | "pago" | "cancelado" | "recorrente" | "pago_parcial" | "pendente";

const ESTADO_ROTULO: Record<EstadoExibicao, string> = {
  vencido: "Vencido",
  pago: "Pago",
  cancelado: "Cancelado",
  recorrente: "Recorrente",
  pago_parcial: "Pago parcial",
  pendente: "Pendente",
};
const ESTADO_COR: Record<EstadoExibicao, string> = {
  vencido: "bg-rose-500",
  pago: "bg-emerald-500",
  cancelado: "bg-stone-400",
  recorrente: "bg-blue-500",
  pago_parcial: "bg-indigo-500",
  pendente: "bg-amber-500",
};
const ESTADO_TEXTO: Record<EstadoExibicao, string> = {
  vencido: "text-rose-700",
  pago: "text-emerald-700",
  cancelado: "text-stone-500",
  recorrente: "text-blue-700",
  pago_parcial: "text-indigo-700",
  pendente: "text-amber-700",
};

export type LancamentoLinha = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: string;
  recorrencia_id: string | null;
  pessoa_id: string | null;
  categoria_id: string | null;
  centro_custo_id: string | null;
  unidade_id: string | null;
  conta_bancaria_id: string | null;
  forma_pagamento: string | null;
  numero_documento: string | null;
  observacoes: string | null;
  financeiro_anexos: { nome: string } | null;
  financeiro_pessoas: { nome: string } | null;
  financeiro_categorias: { nome: string } | null;
  financeiro_unidades: { nome: string } | null;
  financeiro_contas_bancarias: { nome: string } | null;
};

export type CampoOrdenacao = "descricao" | "pessoa" | "categoria" | "vencimento" | "valor" | "status";

function brl(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

/** Uma linha/checkbox por lançamento: a mesma tabela vira cartões no celular. */
export function TabelaLancamentos({ linhas, tipo, rotuloPessoa, categorias, centros, linkOrdenar, iconeOrdenacao }: {
  linhas: (LancamentoLinha & { estado: EstadoExibicao })[];
  tipo: "receita" | "despesa";
  rotuloPessoa: string;
  categorias: { id: string; nome: string }[];
  centros: { id: string; nome: string }[];
  linkOrdenar: (campo: CampoOrdenacao) => string;
  iconeOrdenacao: (campo: CampoOrdenacao) => ReactNode;
}) {
  return (
    <div className="financeiro-lancamentos overflow-x-auto">
    <label className="flex min-h-11 items-center gap-3 border-b border-border px-4 py-3 text-xs text-ink-muted md:hidden">
      <SelecionarTodos formId="form-acoes-lote" className="h-5 w-5 shrink-0 accent-brand" />
      Selecionar lançamentos em aberto desta página
    </label>
    <table className="w-full min-w-[1080px] text-sm">
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
          <th className="w-10 px-2 py-2.5">
            <SelecionarTodos formId="form-acoes-lote" className="accent-brand" />
          </th>
          <th className="min-w-[260px] px-4 py-2.5 font-medium">
            <Link href={linkOrdenar("descricao")} className="inline-flex items-center gap-1 hover:text-ink">
              Descrição {iconeOrdenacao("descricao")}
            </Link>
          </th>
          <th className="hidden min-w-[170px] px-4 py-2.5 font-medium lg:table-cell">
            <Link href={linkOrdenar("pessoa")} className="inline-flex items-center gap-1 hover:text-ink">
              {rotuloPessoa} {iconeOrdenacao("pessoa")}
            </Link>
          </th>
          <th className="hidden min-w-[170px] px-4 py-2.5 font-medium lg:table-cell">
            <Link href={linkOrdenar("categoria")} className="inline-flex items-center gap-1 hover:text-ink">
              Categoria {iconeOrdenacao("categoria")}
            </Link>
          </th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">
            <Link href={linkOrdenar("vencimento")} className="inline-flex items-center gap-1 hover:text-ink">
              Vencimento {iconeOrdenacao("vencimento")}
            </Link>
          </th>
          <th className="px-4 py-2.5 font-medium">
            <Link href={linkOrdenar("valor")} className="inline-flex items-center gap-1 hover:text-ink">
              Valor {iconeOrdenacao("valor")}
            </Link>
          </th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">
            <Link href={linkOrdenar("status")} className="inline-flex items-center gap-1 hover:text-ink">
              Status {iconeOrdenacao("status")}
            </Link>
          </th>
          <th className="hidden min-w-[150px] px-4 py-2.5 font-medium xl:table-cell">Conta</th>
          <th className="sticky right-0 w-28 bg-background px-4 py-2.5 font-medium text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {linhas.map((l) => {
          const pessoa = l.financeiro_pessoas;
          const categoria = l.financeiro_categorias;
          const conta = l.financeiro_contas_bancarias;
          const editavel = l.status === "pendente" || l.status === "pago_parcial";
          const estado = l.estado;
          return (
            <tr key={l.id}>
              <td className="lancamento-selecao px-2 py-2.5">
                {(l.status === "pendente" || l.status === "pago_parcial") && (
                  <label className="-ml-3 -mt-2 flex h-11 w-11 items-center justify-center md:m-0 md:h-auto md:w-auto">
                    <input type="checkbox" name="ids" value={l.id} form="form-acoes-lote" aria-label={`Selecionar ${l.descricao}`} className="accent-brand" />
                  </label>
                )}
              </td>

              <td className="lancamento-descricao px-4 py-3 text-ink">
                <div className="max-w-[380px] break-words font-medium" title={l.descricao}>{l.descricao} {tipo === "despesa" && l.financeiro_anexos && <Link href={`/financeiro/lancamentos/${l.id}/anexos`} aria-label={`Ver anexo de ${l.descricao}`} title={l.financeiro_anexos.nome} className="ml-1 inline-flex align-middle text-brand"><Paperclip size={14} /></Link>} {l.recorrencia_id && <Repeat size={12} className="inline text-ink-muted" />}</div>
                <div className="mt-1 text-xs text-ink-muted lg:hidden">
                  {[pessoa?.nome, categoria?.nome ?? "Sem categoria", conta?.nome].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1 text-xs text-ink-muted md:hidden">Vencimento: {dataBR(l.vencimento)} · {ESTADO_ROTULO[estado]}</div>
              </td>
              <td className="hidden max-w-[240px] break-words px-4 py-2.5 text-ink-muted lg:table-cell" title={pessoa?.nome ?? ""}>{pessoa?.nome ?? "—"}</td>
              <td className="hidden max-w-[260px] break-words px-4 py-2.5 text-ink-muted lg:table-cell" title={categoria?.nome ?? "Sem categoria"}>
                {categoria?.nome ?? <span className="font-medium text-amber-700">Sem categoria</span>}
              </td>
              <td className="hidden px-4 py-2.5 text-ink-muted md:table-cell">{dataBR(l.vencimento)}</td>
              <td className="lancamento-valor num w-28 px-2 py-2.5 text-right text-xs font-medium text-ink sm:text-sm">{brl(l.valor)}</td>
              <td className="hidden px-4 py-2.5 md:table-cell">
                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${ESTADO_TEXTO[estado]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_COR[estado]}`} />
                  {ESTADO_ROTULO[estado]}
                </span>
              </td>
              <td className="hidden max-w-[220px] break-words px-4 py-2.5 text-ink-muted xl:table-cell" title={conta?.nome ?? ""}>{conta?.nome ?? "—"}</td>
              <td className="lancamento-acoes sticky right-0 bg-surface px-4 py-2.5 text-right">
                <MenuAcoesLancamento
                  id={l.id}
                  descricao={l.descricao}
                  tipo={tipo}
                  status={l.status}
                  editavel={editavel}
                  recorrente={!!l.recorrencia_id}
                  podeCategorizar={tipo === "receita" && !l.categoria_id && (l.status === "pago" || l.status === "pago_parcial")}
                  categorias={categorias ?? []}
                  centros={centros ?? []}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
