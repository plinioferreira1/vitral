/**
 * Seleção de imóveis para o cliente: perfil, links de busca nos portais,
 * anúncios escolhidos pelo corretor, repetidos e entrada do PDF.
 *
 * O Vitral não lê nem raspa os portais: os links de busca abrem no navegador
 * do corretor, e os dados de cada anúncio são os que ele confere e digita.
 */

export type Finalidade = "venda" | "aluguel";
export const TIPOS_IMOVEL = ["Apartamento", "Casa", "Casa em condomínio", "Cobertura", "Kitnet/Studio", "Lote", "Sala comercial", "Loja"] as const;

export type Perfil = {
  cliente: string;
  finalidade: Finalidade;
  tipo: string;
  regiao: string;
  precoMax: number | null; // reais
  quartos: number | null;
  vagas: number | null;
  areaMin: number | null; // m²
  financiamento: boolean;
};

export type Portal = { nome: string; dominio: string };

/** Portais de onde o corretor pode trazer anúncios (link conferido pelo domínio). */
export const PORTAIS: Portal[] = [
  { nome: "DF Imóveis", dominio: "dfimoveis.com.br" },
  { nome: "ZAP Imóveis", dominio: "zapimoveis.com.br" },
  { nome: "Viva Real", dominio: "vivareal.com.br" },
  { nome: "OLX", dominio: "olx.com.br" },
  { nome: "Imovelweb", dominio: "imovelweb.com.br" },
  { nome: "QuintoAndar", dominio: "quintoandar.com.br" },
  { nome: "Netimóveis", dominio: "netimoveis.com" },
];

const mil = (reais: number) =>
  reais >= 1_000_000
    ? `${(reais / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} milhões`
    : reais >= 100_000
      ? `${Math.round(reais / 1000).toLocaleString("pt-BR")} mil`
      : reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/** Texto da busca a partir do perfil (o mesmo para todos os portais). */
export function termosDaBusca(p: Perfil): string {
  const partes = [
    p.tipo,
    p.quartos ? `${p.quartos} quartos` : "",
    p.vagas ? `${p.vagas} ${p.vagas === 1 ? "vaga" : "vagas"}` : "",
    p.areaMin ? `${p.areaMin} m²` : "",
    p.finalidade === "aluguel" ? "aluguel" : "venda",
    p.regiao,
    p.precoMax ? `até R$ ${mil(p.precoMax)}` : "",
    p.financiamento && p.finalidade === "venda" ? "aceita financiamento" : "",
  ];
  return partes.map((s) => s.trim()).filter(Boolean).join(" ");
}

/**
 * Um link por portal: pesquisa no Google restrita ao site do portal. Abre no
 * navegador de quem clicou, como uma busca comum; nada é lido pelo Vitral.
 */
export function linksDeBusca(p: Perfil): { portal: string; url: string }[] {
  const termos = termosDaBusca(p);
  return PORTAIS.map((portal) => ({
    portal: portal.nome,
    url: `https://www.google.com/search?q=${encodeURIComponent(`site:${portal.dominio} ${termos}`)}`,
  }));
}

/** Confere se o link é https de um portal conhecido e diz qual. */
export function portalDoLink(link: string): Portal | null {
  try {
    const url = new URL(link.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    return PORTAIS.find((p) => host === p.dominio || host.endsWith(`.${p.dominio}`)) ?? null;
  } catch {
    return null;
  }
}

export type Anuncio = {
  id: string;
  link: string;
  titulo: string;
  endereco: string;
  preco: number | null; // reais
  condominio: number | null; // reais/mês
  area: number | null;
  quartos: number | null;
  vagas: number | null;
  observacao: string;
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(apartamento|apto|ap|bloco|bl|lote|lt|conjunto|cj|casa|unidade)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function linkCanonico(link: string): string {
  try {
    const url = new URL(link.trim());
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return link.trim().toLowerCase();
  }
}

const perto = (a: number | null, b: number | null, tolerancia: number) =>
  a !== null && b !== null && a > 0 && b > 0 && Math.abs(a - b) / Math.max(a, b) <= tolerancia;

/**
 * Dois anúncios são o mesmo imóvel quando têm o mesmo link, ou o mesmo
 * endereço (sem pontuação/acentos) com área e preço até 3% de diferença —
 * o mesmo imóvel costuma aparecer em vários portais por imobiliárias
 * diferentes.
 */
export function mesmoImovel(a: Anuncio, b: Anuncio): boolean {
  if (linkCanonico(a.link) === linkCanonico(b.link)) return true;
  const ea = normalizar(a.endereco);
  const eb = normalizar(b.endereco);
  if (!ea || ea !== eb) return false;
  return perto(a.area, b.area, 0.03) && perto(a.preco, b.preco, 0.03);
}

/** Ids marcados como repetidos (o primeiro de cada grupo fica de fora). */
export function repetidos(lista: Anuncio[]): Map<string, string> {
  const marcados = new Map<string, string>();
  lista.forEach((atual, i) => {
    if (marcados.has(atual.id)) return;
    for (const outro of lista.slice(i + 1)) {
      if (!marcados.has(outro.id) && mesmoImovel(atual, outro)) marcados.set(outro.id, atual.id);
    }
  });
  return marcados;
}

/** O que o anúncio deixa a desejar em relação ao perfil (para o corretor ver antes de mandar). */
export function foraDoPerfil(a: Anuncio, p: Perfil): string[] {
  const avisos: string[] = [];
  if (p.precoMax && a.preco && a.preco > p.precoMax) avisos.push("acima do valor máximo");
  if (p.quartos && a.quartos !== null && a.quartos < p.quartos) avisos.push("menos quartos");
  if (p.vagas && a.vagas !== null && a.vagas < p.vagas) avisos.push("menos vagas");
  if (p.areaMin && a.area && a.area < p.areaMin) avisos.push("área menor");
  return avisos;
}

const num = (v: unknown, max: number): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 100) / 100 : null;
};
const txt = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Lê e confere o corpo enviado para o PDF. Nunca confia no navegador. */
export function lerEntradaSelecao(corpo: unknown): { perfil: Perfil; anuncios: Anuncio[]; mensagem: string } | { erro: string } {
  if (!corpo || typeof corpo !== "object") return { erro: "Dados inválidos." };
  const c = corpo as Record<string, unknown>;
  const p = (c.perfil ?? {}) as Record<string, unknown>;
  const perfil: Perfil = {
    cliente: txt(p.cliente, 120),
    finalidade: p.finalidade === "aluguel" ? "aluguel" : "venda",
    tipo: txt(p.tipo, 40),
    regiao: txt(p.regiao, 120),
    precoMax: num(p.precoMax, 1e9),
    quartos: num(p.quartos, 20),
    vagas: num(p.vagas, 20),
    areaMin: num(p.areaMin, 1e6),
    financiamento: p.financiamento === true,
  };
  const brutos = Array.isArray(c.anuncios) ? c.anuncios.slice(0, 30) : [];
  const anuncios: Anuncio[] = [];
  for (const [i, b] of brutos.entries()) {
    const a = (b ?? {}) as Record<string, unknown>;
    const link = txt(a.link, 600);
    if (!portalDoLink(link)) return { erro: `O anúncio ${i + 1} não tem um link https de portal conhecido.` };
    anuncios.push({
      id: txt(a.id, 40) || String(i),
      link,
      titulo: txt(a.titulo, 140),
      endereco: txt(a.endereco, 200),
      preco: num(a.preco, 1e9),
      condominio: num(a.condominio, 1e6),
      area: num(a.area, 1e6),
      quartos: num(a.quartos, 20),
      vagas: num(a.vagas, 20),
      observacao: txt(a.observacao, 400),
    });
  }
  if (!perfil.cliente) return { erro: "Informe o nome do cliente." };
  if (anuncios.length === 0) return { erro: "Inclua ao menos um anúncio." };
  return { perfil, anuncios, mensagem: txt(c.mensagem, 800) };
}
