"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CheckCircle2, Copy, MoreHorizontal, Paperclip, Pencil, RefreshCcw, Tag, Trash2, X, Undo2 } from "lucide-react";
import {
  cancelarLancamento,
  categorizarLancamento,
  excluirLancamento,
  reativarLancamento,
} from "@/app/(app)/financeiro/lancamentos-actions";
import { BotaoEnviar } from "@/components/botao-enviar";
import { ESCOPOS_EXCLUSAO, ROTULO_ESCOPO_EXCLUSAO } from "@/lib/exclusao-lancamentos";

type Opcao = { id: string; nome: string };

type PosicaoMenu = {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
};

type MenuAcoesLancamentoProps = {
  id: string;
  descricao: string;
  tipo: "receita" | "despesa";
  status: string;
  editavel: boolean;
  /** faz parte de uma série (recorrência/parcelamento) */
  recorrente: boolean;
  podeCategorizar: boolean;
  categorias: Opcao[];
  centros: Opcao[];
};

export function MenuAcoesLancamento({
  id,
  descricao,
  tipo,
  status,
  editavel,
  recorrente,
  podeCategorizar,
  categorias,
  centros,
}: MenuAcoesLancamentoProps) {
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const temBaixa = status === "pago" || status === "pago_parcial";
  const [posicao, setPosicao] = useState<PosicaoMenu>({ top: 0, left: 0, maxHeight: 520 });
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const baixavel = status !== "pago" && status !== "cancelado";

  function calcularPosicao(): PosicaoMenu | null {
    const rect = botaoRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const margem = 16;
    const espacamento = 8;
    const largura = Math.min(360, window.innerWidth - margem * 2);
    const espacoAbaixo = window.innerHeight - rect.bottom - margem - espacamento;
    const espacoAcima = rect.top - margem - espacamento;
    const abrirAcima = espacoAbaixo < 260 && espacoAcima > espacoAbaixo;
    const espacoDisponivel = Math.max(120, abrirAcima ? espacoAcima : espacoAbaixo);
    const base = {
      left: Math.min(window.innerWidth - largura - margem, Math.max(margem, rect.right - largura)),
      maxHeight: Math.min(520, espacoDisponivel),
    };

    if (abrirAcima) {
      return {
        ...base,
        bottom: window.innerHeight - rect.top + espacamento,
      };
    }

    return {
      ...base,
      top: rect.bottom + espacamento,
    };
  }

  function abrirMenu() {
    const novaPosicao = calcularPosicao();
    if (!novaPosicao) return;
    setPosicao(novaPosicao);
    setAberto((atual) => !atual);
  }

  useEffect(() => {
    if (!aberto) return;
    function fecharFora(event: MouseEvent) {
      const alvo = event.target as Node;
      if (menuRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    function fecharTecla(event: KeyboardEvent) {
      if (event.key === "Escape") setAberto(false);
    }
    function reposicionarOuFechar(event: Event) {
      const alvo = event.target as Node | null;
      if (alvo && menuRef.current?.contains(alvo)) return;
      const novaPosicao = calcularPosicao();
      if (novaPosicao) setPosicao(novaPosicao);
    }
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    window.addEventListener("resize", reposicionarOuFechar);
    window.addEventListener("scroll", reposicionarOuFechar, true);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
      window.removeEventListener("resize", reposicionarOuFechar);
      window.removeEventListener("scroll", reposicionarOuFechar, true);
    };
  }, [aberto]);

  const itemClasse =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-muted hover:bg-background hover:text-brand";

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={abrirMenu}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-ink hover:bg-background"
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={`Ações para ${descricao}`}
      >
        <MoreHorizontal size={16} />
        Ações
      </button>

      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-40 pointer-events-none">
            <div
              ref={menuRef}
              role="dialog"
              aria-label={`Ações para ${descricao}`}
              className="financeiro-acoes pointer-events-auto w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-surface p-3 text-left shadow-2xl"
              style={{
                top: posicao.top,
                bottom: posicao.bottom,
                left: posicao.left,
                maxHeight: posicao.maxHeight,
                position: "fixed",
              }}
            >
              <div className="mb-2 flex items-start justify-between gap-3 border-b border-border pb-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Ações</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-bold text-ink">{descricao}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md p-1 text-ink-muted hover:bg-background hover:text-ink"
                  aria-label="Fechar ações"
                >
                  <X size={16} />
                </button>
              </div>

              {podeCategorizar && (
                <form action={categorizarLancamento} className="mb-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <input type="hidden" name="id" value={id} />
                  <p className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <Tag size={14} /> Categorizar agora
                  </p>
                  <select
                    name="categoria_id"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-brand"
                  >
                    <option value="" disabled>
                      Selecione a categoria...
                    </option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                  <select
                    name="centro_custo_id"
                    defaultValue=""
                    className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-brand"
                  >
                    <option value="">Centro de resultado (opcional)</option>
                    {centros.map((centro) => (
                      <option key={centro.id} value={centro.id}>
                        {centro.nome}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="w-full rounded-md bg-brand px-3 py-2 text-xs font-bold text-white hover:opacity-90">
                    Salvar categoria
                  </button>
                </form>
              )}

              <div className="space-y-1">
                {tipo === "despesa" && (
                  <Link href={`/financeiro/lancamentos/${id}/anexos`} className={itemClasse}>
                    <Paperclip size={15} strokeWidth={2} /> Anexo / boleto
                  </Link>
                )}
                {editavel && (
                  <Link href={`/financeiro/lancamentos/${id}/editar`} className={itemClasse}>
                    <Pencil size={15} strokeWidth={2} /> Editar
                  </Link>
                )}
                <Link href={`/financeiro/lancamentos/novo?tipo=${tipo}&clonar=${id}`} className={itemClasse}>
                  <Copy size={15} strokeWidth={2} /> Clonar {tipo === "receita" ? "receita" : "despesa"}
                </Link>
                {baixavel && (
                  <>
                    <Link
                      href={`/financeiro/lancamentos/${id}/baixar`}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      <CheckCircle2 size={15} strokeWidth={2} /> {tipo === "receita" ? "Receber" : "Pagar"}
                    </Link>
                    <form action={cancelarLancamento}>
                      <input type="hidden" name="id" value={id} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-muted hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Ban size={15} strokeWidth={2} /> Cancelar
                      </button>
                    </form>
                  </>
                )}
                {(status === "pago" || status === "pago_parcial") && (
                  <Link href={`/financeiro/lancamentos/${id}/baixar#pagamentos`} className={itemClasse}>
                    <Undo2 size={15} strokeWidth={2} /> Ver pagamentos / estornar
                  </Link>
                )}
                {status === "cancelado" && (
                  <form action={reativarLancamento}>
                    <input type="hidden" name="id" value={id} />
                    <button type="submit" className={itemClasse}>
                      <RefreshCcw size={15} strokeWidth={2} /> Reativar
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    setExcluindo(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 size={15} strokeWidth={2} /> Excluir
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {excluindo &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setExcluindo(false);
            }}
          >
            <form
              action={async (formData) => {
                await excluirLancamento(formData);
                setExcluindo(false);
              }}
              role="dialog"
              aria-modal="true"
              aria-label={`Excluir ${descricao}`}
              className="financeiro-acoes max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-5 text-left shadow-2xl"
            >
              <input type="hidden" name="id" value={id} />
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Excluir {tipo === "receita" ? "receita" : "despesa"}
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink">{descricao}</p>

              {recorrente ? (
                <fieldset className="mt-4">
                  <legend className="text-sm text-ink">
                    Ao confirmar esta ação, quais lançamentos você deseja excluir?
                  </legend>
                  <div className="mt-3 space-y-1">
                    {ESCOPOS_EXCLUSAO.map((escopo) => (
                      <label
                        key={escopo}
                        className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm text-ink hover:bg-background"
                      >
                        <input
                          type="radio"
                          name="escopo"
                          value={escopo}
                          defaultChecked={escopo === "um"}
                          className="mt-0.5 accent-brand"
                        />
                        {ROTULO_ESCOPO_EXCLUSAO[escopo]}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 rounded-md bg-background px-3 py-2 text-xs text-ink-muted">
                    &quot;Todos os lançamentos&quot; apaga a série inteira, inclusive os já pagos e os pagamentos
                    registrados neles — o saldo das contas muda.
                  </p>
                </fieldset>
              ) : (
                <p className="mt-4 text-sm text-ink">Tem certeza que deseja excluir este lançamento?</p>
              )}

              {temBaixa && (
                <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  Este lançamento já tem pagamento registrado. Ao excluir, o pagamento também é apagado e o saldo da
                  conta muda.
                </p>
              )}

              <p className="mt-3 text-xs text-ink-muted">A exclusão não pode ser desfeita.</p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExcluindo(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
                >
                  Voltar
                </button>
                <BotaoEnviar
                  textoEnviando="Excluindo…"
                  className="rounded-md bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  Excluir
                </BotaoEnviar>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
