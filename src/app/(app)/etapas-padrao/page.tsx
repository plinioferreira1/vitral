import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  adicionarEtapaPadrao,
  removerEtapaPadrao,
  editarEtapaPadrao,
  moverEtapaPadrao,
} from "./actions";
import type { CategoriaProcesso, TipoEtapaPadrao } from "@/lib/types";
import { CATEGORIA_LABEL } from "@/lib/types";

interface EtapaRow {
  id: string;
  nome: string;
  ordem: number;
  tipo: TipoEtapaPadrao;
}

export default async function EtapasPadraoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: categoriaParam } = await searchParams;
  const categoria = (categoriaParam as CategoriaProcesso) || "venda";

  const supabase = await createClient();

  const { data: etapas } = await supabase
    .from("etapas_padrao")
    .select("id, nome, ordem, tipo")
    .eq("categoria", categoria)
    .order("ordem", { ascending: true });

  const abas: CategoriaProcesso[] = ["venda", "financiamento"];
  const sequenciais = (etapas ?? []).filter((e) => e.tipo === "sequencial");
  const especiais = (etapas ?? []).filter((e) => e.tipo === "especial");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold uppercase tracking-wide text-ink">
          Etapas padrão
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          A <b>sequência normal</b> é a linha do tempo do processo, em ordem. As{" "}
          <b>situações especiais</b> são exceções que podem acontecer a qualquer momento, fora
          da ordem (judicial, inadimplência, acordo) — não entram na linha do tempo.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
        {abas.map((c) => (
          <Link
            key={c}
            href={`/etapas-padrao?categoria=${c}`}
            className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
              categoria === c ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
            }`}
          >
            {CATEGORIA_LABEL[c]}
          </Link>
        ))}
      </div>

      <form
        action={adicionarEtapaPadrao}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3"
      >
        <input type="hidden" name="categoria" value={categoria} />
        <input
          name="nome"
          required
          placeholder="Nome da nova etapa (ex: Vistoria de Entrada)"
          className="flex-1 min-w-[160px] rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <select
          name="tipo"
          defaultValue="sequencial"
          className="rounded-md border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="sequencial">Sequência normal</option>
          <option value="especial">Situação especial</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Sequência normal
        </p>
        <ListaEtapas etapas={sequenciais} categoria={categoria} tipo="sequencial" />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Situações especiais
        </p>
        <ListaEtapas etapas={especiais} categoria={categoria} tipo="especial" />
      </div>
    </div>
  );
}

function ListaEtapas({
  etapas,
  categoria,
  tipo,
}: {
  etapas: EtapaRow[];
  categoria: CategoriaProcesso;
  tipo: TipoEtapaPadrao;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      {etapas.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-muted">Nenhuma etapa aqui ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {etapas.map((e, i) => (
            <li key={e.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <form action={moverEtapaPadrao}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="categoria" value={categoria} />
                      <input type="hidden" name="tipo" value={tipo} />
                      <input type="hidden" name="direcao" value="cima" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        aria-label="Mover pra cima"
                        className="flex h-4 w-4 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-20"
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12">
                          <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </form>
                    <form action={moverEtapaPadrao}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="categoria" value={categoria} />
                      <input type="hidden" name="tipo" value={tipo} />
                      <input type="hidden" name="direcao" value="baixo" />
                      <button
                        type="submit"
                        disabled={i === etapas.length - 1}
                        aria-label="Mover pra baixo"
                        className="flex h-4 w-4 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-20"
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12">
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </form>
                  </div>
                  <span className="text-sm text-ink">{e.nome}</span>
                </div>

                <div className="flex items-center gap-1">
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md p-1.5 text-ink-muted hover:bg-background">
                      ✎
                    </summary>
                    <form
                      action={editarEtapaPadrao}
                      className="absolute right-0 z-10 mt-1 flex items-center gap-1.5 rounded-md border border-border bg-surface p-2 shadow-md"
                    >
                      <input type="hidden" name="id" value={e.id} />
                      <input
                        name="nome"
                        defaultValue={e.nome}
                        className="w-40 rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                      />
                      <select
                        name="tipo"
                        defaultValue={tipo}
                        className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs outline-none focus:border-brand"
                      >
                        <option value="sequencial">Sequência</option>
                        <option value="especial">Especial</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Salvar
                      </button>
                    </form>
                  </details>
                  <form action={removerEtapaPadrao}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      aria-label={`Remover ${e.nome}`}
                      className="rounded-md p-1.5 text-ink-muted hover:bg-background hover:text-rose-600"
                    >
                      🗑
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
