/**
 * Identidade visual simplificada dos bancos mais comuns, usada nos
 * badges de "Contas Bancárias" e na Visão Geral do Financeiro.
 * Sem depender de logos externos: cada banco vira um selo com sigla,
 * nome canônico e cores aproximadas da marca.
 */
export type BancoIdentidade = {
  sigla: string;
  nome: string;
  bg: string;
  fg: string;
  accent: string;
  border?: string;
  generico?: boolean;
};

const BANCOS: Record<string, BancoIdentidade> = {
  itau: { sigla: "Itaú", nome: "Itaú", bg: "#EC7000", fg: "#ffffff", accent: "#1F3C88" },
  bradesco: { sigla: "Bradesco", nome: "Bradesco", bg: "#CC092F", fg: "#ffffff", accent: "#8B001B" },
  santander: { sigla: "Santander", nome: "Santander", bg: "#EC0000", fg: "#ffffff", accent: "#B00000" },
  caixa: { sigla: "Caixa", nome: "Caixa", bg: "#0070AD", fg: "#ffffff", accent: "#F58220" },
  "banco do brasil": { sigla: "BB", nome: "Banco do Brasil", bg: "#F8D117", fg: "#00338D", accent: "#FFE76A" },
  bb: { sigla: "BB", nome: "Banco do Brasil", bg: "#F8D117", fg: "#00338D", accent: "#FFE76A" },
  inter: { sigla: "Inter", nome: "Inter", bg: "#FF7A00", fg: "#ffffff", accent: "#E45F00" },
  nubank: { sigla: "Nu", nome: "Nubank", bg: "#820AD1", fg: "#ffffff", accent: "#5F069D" },
  sicoob: { sigla: "Sicoob", nome: "Sicoob", bg: "#00A650", fg: "#ffffff", accent: "#007C41" },
  sicredi: { sigla: "Sicredi", nome: "Sicredi", bg: "#6AB023", fg: "#ffffff", accent: "#3F7E1F" },
  original: { sigla: "Original", nome: "Original", bg: "#00AA4F", fg: "#ffffff", accent: "#007A37" },
  btg: { sigla: "BTG", nome: "BTG Pactual", bg: "#0B2A4A", fg: "#ffffff", accent: "#153F68" },
  safra: { sigla: "Safra", nome: "Safra", bg: "#00263A", fg: "#ffffff", accent: "#0B3C5D" },
  c6: { sigla: "C6", nome: "C6 Bank", bg: "#1A1A1A", fg: "#ffffff", accent: "#3A3A3A" },
  neon: { sigla: "Neon", nome: "Neon", bg: "#00E4A0", fg: "#00263A", accent: "#00B8FF" },
  pagseguro: { sigla: "PagBank", nome: "PagBank", bg: "#FFC801", fg: "#0B0B0B", accent: "#FFE066" },
  pagbank: { sigla: "PagBank", nome: "PagBank", bg: "#FFC801", fg: "#0B0B0B", accent: "#FFE066" },
  "mercado pago": { sigla: "Mercado Pago", nome: "Mercado Pago", bg: "#00AAEF", fg: "#ffffff", accent: "#008DD2" },
  xp: { sigla: "XP", nome: "XP", bg: "#111111", fg: "#F7C948", accent: "#2A2A2A" },
  stone: { sigla: "Stone", nome: "Stone", bg: "#00A868", fg: "#ffffff", accent: "#007D4D" },
};

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function identidadeBanco(nomeBanco: string | null | undefined): BancoIdentidade {
  const nome = (nomeBanco ?? "").trim();
  const chave = normalizar(nome);
  for (const [k, v] of Object.entries(BANCOS)) {
    if (chave.includes(k)) return v;
  }
  const iniciais = (nome || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    sigla: iniciais || "?",
    nome: nome || "Banco",
    bg: "#E7E2DC",
    fg: "#4A4038",
    accent: "#F4F0EA",
    border: "#D8CFC6",
    generico: true,
  };
}
