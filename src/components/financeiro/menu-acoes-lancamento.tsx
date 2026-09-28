"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CheckCircle2, Copy, MoreHorizontal, Pencil, RefreshCcw, Tag, X } from "lucide-react";
import { cancelarLancamento, categorizarLancamento, reativarLancamento } from "@/app/(app)/financeiro/lancamentos-actions";

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
  podeCategorizar,
  categorias,
  centros,
}: MenuAcoesLancamentoProps) {
  const [aberto, setAberto] = useState(false);
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
              className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-surface p-3 text-left shadow-2xl"
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
                  className="rounded-md p-1 text-ink-muted hover:bg-background hover:text-ink"
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
                {status === "cancelado" && (
                  <form action={reativarLancamento}>
                    <input type="hidden" name="id" value={id} />
                    <button type="submit" className={itemClasse}>
                      <RefreshCcw size={15} strokeWidth={2} /> Reativar
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
