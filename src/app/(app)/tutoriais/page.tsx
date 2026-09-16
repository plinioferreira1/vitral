import { createClient } from "@/lib/supabase/server";
import { adicionarTutorial, editarTutorial, removerTutorial } from "./actions";

interface TutorialRow {
  id: string;
  categoria: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  conteudo: string | null;
  link: string | null;
  ordem: number;
}

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export default async function TutoriaisPage() {
  const supabase = await createClient();
  const { data: tutoriaisRaw } = await supabase
    .from("tutoriais")
    .select("id, categoria, tipo, titulo, descricao, conteudo, link, ordem")
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true });

  const tutoriais = (tutoriaisRaw ?? []) as TutorialRow[];
  const categorias = Array.from(new Set(tutoriais.map((t) => t.categoria)));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tutoriais</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tutoriais de como usar o Vitral, organizados por categoria (ex: Vendas, Financiamento,
          Locação, Google Agenda). Aparecem pra todo mundo na aba Onboarding. Pode ser um vídeo
          (cola o link do YouTube, Loom, Drive etc.) ou um texto escrito direto aqui.
        </p>
      </div>

      <form
        action={adicionarTutorial}
        className="space-y-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Novo tutorial
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="categoria"
            required
            list="categorias-tutorial"
            placeholder="Categoria (ex: Vendas)"
            className={campoClasse}
          />
          <datalist id="categorias-tutorial">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <select name="tipo" defaultValue="texto" className={campoClasse}>
            <option value="texto">Texto</option>
            <option value="video">Vídeo</option>
          </select>
        </div>
        <input name="titulo" required placeholder="Título" className={campoClasse} />
        <input
          name="descricao"
          placeholder="Descrição curta (opcional)"
          className={campoClasse}
        />
        <input
          name="link"
          placeholder="Link do vídeo (se for vídeo) — YouTube, Loom, Drive..."
          className={campoClasse}
        />
        <textarea
          name="conteudo"
          rows={4}
          placeholder="Texto do tutorial (se for texto)"
          className={campoClasse}
        />
        <input
          name="ordem"
          type="number"
          defaultValue={0}
          placeholder="Ordem"
          className={`${campoClasse} max-w-[120px]`}
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      {categorias.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
          Nenhum tutorial cadastrado ainda.
        </p>
      ) : (
        categorias.map((categoria) => (
          <div key={categoria} className="rounded-xl border border-border/60 bg-surface shadow-sm">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">
              {categoria}
            </p>
            <ul className="divide-y divide-border">
              {tutoriais
                .filter((t) => t.categoria === categoria)
                .map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          {t.titulo}{" "}
                          <span className="text-xs text-ink-muted">
                            ({t.tipo === "video" ? "vídeo" : "texto"})
                          </span>
                        </p>
                        {t.descricao && <p className="text-xs text-ink-muted">{t.descricao}</p>}
                        {t.link && <p className="truncate text-xs text-brand">{t.link}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-md p-1.5 text-ink-muted hover:bg-background">
                            ✎
                          </summary>
                          <form
                            action={editarTutorial}
                            className="absolute right-0 z-10 mt-1 w-80 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                          >
                            <input type="hidden" name="id" value={t.id} />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                name="categoria"
                                defaultValue={t.categoria}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <select
                                name="tipo"
                                defaultValue={t.tipo}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              >
                                <option value="texto">Texto</option>
                                <option value="video">Vídeo</option>
                              </select>
                            </div>
                            <input
                              name="titulo"
                              defaultValue={t.titulo}
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <input
                              name="descricao"
                              defaultValue={t.descricao ?? ""}
                              placeholder="Descrição curta"
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <input
                              name="link"
                              defaultValue={t.link ?? ""}
                              placeholder="Link do vídeo"
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <textarea
                              name="conteudo"
                              rows={3}
                              defaultValue={t.conteudo ?? ""}
                              placeholder="Texto do tutorial"
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <input
                              name="ordem"
                              type="number"
                              defaultValue={t.ordem}
                              className="w-20 rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <button
                              type="submit"
                              className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                            >
                              Salvar
                            </button>
                          </form>
                        </details>
                        <form action={removerTutorial}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            aria-label={`Remover ${t.titulo}`}
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
          </div>
        ))
      )}
    </div>
  );
}
