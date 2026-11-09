export const CATEGORIAS_FONTES = [
  { id: "portais", titulo: "Portais imobiliários" },
  { id: "marketing", titulo: "Marketing digital" },
  { id: "relacionamento", titulo: "Indicações e relacionamento" },
  { id: "rede", titulo: "Rede e captação" },
  { id: "outros", titulo: "Outros" },
] as const;

export type CategoriaFonte = typeof CATEGORIAS_FONTES[number]["id"];
export type FonteAgrupada = { nome: string; categoria: CategoriaFonte };

export const FONTES_PADRAO: FonteAgrupada[] = [
  { nome: "DF Imóveis", categoria: "portais" },
  { nome: "Wimóveis", categoria: "portais" },
  { nome: "OLX", categoria: "portais" },
  { nome: "Viva Real", categoria: "portais" },
  { nome: "Instagram", categoria: "marketing" },
  { nome: "Tráfego SACRA", categoria: "marketing" },
  { nome: "Tráfego terceiros", categoria: "marketing" },
  { nome: "Site SACRA", categoria: "marketing" },
  { nome: "Indicação", categoria: "relacionamento" },
  { nome: "WhatsApp", categoria: "relacionamento" },
  { nome: "SAN", categoria: "rede" },
  { nome: "Captação", categoria: "rede" },
  { nome: "Carteira", categoria: "rede" },
  { nome: "Outros", categoria: "outros" },
];

// Compatibilidade com telas antigas. Indefinido é legado, não deve ser selecionável.
export const FONTES_LEADS = FONTES_PADRAO.map(f => f.nome);
export const categoriaValida = (value: string): value is CategoriaFonte =>
  CATEGORIAS_FONTES.some(c => c.id === value);

export function agruparFontes(fontes: FonteAgrupada[]) {
  return CATEGORIAS_FONTES.map(categoria => ({
    ...categoria,
    fontes: fontes.filter(f => f.categoria === categoria.id),
  })).filter(grupo => grupo.fontes.length > 0);
}
