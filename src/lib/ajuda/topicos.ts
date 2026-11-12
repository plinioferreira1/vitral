/**
 * Central de ajuda: tudo o que a página mostra vira um "tópico" com o mesmo
 * formato (tutoriais do banco, guias fixos, modelos de mensagem, documentos),
 * para uma única busca e um único filtro por assunto. Funções puras.
 */

export const ASSUNTOS = [
  "Primeiros passos",
  "Vendas",
  "Captação",
  "Locação",
  "Financiamentos",
  "Financeiro",
  "Modelos e documentos",
  "Links úteis",
] as const;

export type Assunto = (typeof ASSUNTOS)[number] | "Outros";

export type TipoTopico = "video" | "guia" | "passo-a-passo" | "mensagem" | "documento" | "links";

export type CorpoTopico =
  | { tipo: "lista"; ordenada: boolean; itens: string[] }
  | { tipo: "definicoes"; itens: { termo: string; texto: string }[] }
  | { tipo: "links"; itens: { rotulo: string; href: string }[] }
  | { tipo: "mensagem"; texto: string }
  | { tipo: "download"; href: string; formato: string }
  | { tipo: "video"; link: string }
  | { tipo: "texto"; texto: string; link: string | null };

export type Topico = {
  slug: string;
  assunto: Assunto;
  tipo: TipoTopico;
  titulo: string;
  descricao: string | null;
  intro?: string;
  corpo: CorpoTopico;
};

export type TutorialBanco = {
  id: string;
  categoria: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  conteudo: string | null;
  link: string | null;
};

/** Minúsculas e sem acento: "Locação" e "locacao" se encontram. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function slugTopico(titulo: string): string {
  return normalizar(titulo).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "topico";
}

/** Categoria digitada livremente no cadastro → um dos assuntos fixos. */
export function assuntoDe(categoria: string): Assunto {
  const alvo = normalizar(categoria.trim());
  return ASSUNTOS.find((a) => normalizar(a) === alvo) ?? "Outros";
}

export function tutorialParaTopico(t: TutorialBanco): Topico {
  const video = t.tipo === "video" && !!t.link;
  return {
    slug: `${slugTopico(t.titulo)}-${t.id.slice(0, 6)}`,
    assunto: assuntoDe(t.categoria),
    tipo: video ? "video" : "guia",
    titulo: t.titulo,
    descricao: t.descricao,
    intro: video && t.conteudo ? t.conteudo : undefined,
    corpo: video ? { tipo: "video", link: t.link! } : { tipo: "texto", texto: t.conteudo ?? "", link: t.link },
  };
}

function textoDoCorpo(c: CorpoTopico): string {
  switch (c.tipo) {
    case "lista":
      return c.itens.join(" ");
    case "definicoes":
      return c.itens.map((i) => `${i.termo} ${i.texto}`).join(" ");
    case "links":
      return c.itens.map((i) => i.rotulo).join(" ");
    case "mensagem":
    case "texto":
      return c.texto;
    default:
      return "";
  }
}

/**
 * Tópicos do assunto escolhido que contêm todas as palavras buscadas
 * (em qualquer ordem). Os que batem no título vêm primeiro.
 */
export function buscarTopicos(topicos: Topico[], busca: string, assunto: Assunto | null): Topico[] {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  const doAssunto = assunto ? topicos.filter((t) => t.assunto === assunto) : topicos;
  if (!palavras.length) return doAssunto;
  return doAssunto
    .map((t) => {
      const titulo = normalizar(t.titulo);
      const tudo = normalizar([t.titulo, t.descricao ?? "", t.intro ?? "", t.assunto, textoDoCorpo(t.corpo)].join(" "));
      if (!palavras.every((p) => tudo.includes(p))) return null;
      return { t, noTitulo: palavras.filter((p) => titulo.includes(p)).length };
    })
    .filter((x): x is { t: Topico; noTitulo: number } => x !== null)
    .sort((a, b) => b.noTitulo - a.noTitulo)
    .map((x) => x.t);
}

/** Assuntos que têm ao menos um tópico, na ordem fixa ("Outros" por último). */
export function assuntosComTopicos(topicos: Topico[]): Assunto[] {
  const presentes = new Set(topicos.map((t) => t.assunto));
  return [...ASSUNTOS, "Outros" as const].filter((a) => presentes.has(a));
}
