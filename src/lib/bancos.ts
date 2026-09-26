/**
 * Identidade visual simplificada dos bancos mais comuns, usada nos
 * badges de "Contas Bancárias" e na Visão Geral do Financeiro.
 * Sem depender de logos externos: cada banco vira um selo com sigla
 * e cores aproximadas da marca. Bancos não mapeados caem num selo
 * neutro com as iniciais do nome.
 */
const BANCOS: Record<string, { sigla: string; bg: string; fg: string }> = {
  itau: { sigla: "Itaú", bg: "#EC7000", fg: "#ffffff" },
  bradesco: { sigla: "Bradesco", bg: "#CC092F", fg: "#ffffff" },
  santander: { sigla: "Santander", bg: "#EC0000", fg: "#ffffff" },
  caixa: { sigla: "Caixa", bg: "#0070AD", fg: "#ffffff" },
  "banco do brasil": { sigla: "BB", bg: "#F8D117", fg: "#00338D" },
  bb: { sigla: "BB", bg: "#F8D117", fg: "#00338D" },
  inter: { sigla: "Inter", bg: "#FF7A00", fg: "#ffffff" },
  nubank: { sigla: "Nu", bg: "#820AD1", fg: "#ffffff" },
  sicoob: { sigla: "Sicoob", bg: "#00A650", fg: "#ffffff" },
  sicredi: { sigla: "Sicredi", bg: "#6AB023", fg: "#ffffff" },
  original: { sigla: "Original", bg: "#00AA4F", fg: "#ffffff" },
  btg: { sigla: "BTG", bg: "#0B2A4A", fg: "#ffffff" },
  safra: { sigla: "Safra", bg: "#00263A", fg: "#ffffff" },
  c6: { sigla: "C6", bg: "#1A1A1A", fg: "#ffffff" },
  neon: { sigla: "Neon", bg: "#00E4A0", fg: "#00263A" },
  pagseguro: { sigla: "PagBank", bg: "#FFC801", fg: "#0B0B0B" },
  mercado_pago: { sigla: "Mercado Pago", bg: "#00AAEF", fg: "#ffffff" },
};

export function identidadeBanco(nomeBanco: string | null | undefined) {
  const chave = (nomeBanco ?? "").trim().toLowerCase();
  for (const [k, v] of Object.entries(BANCOS)) {
    if (chave.includes(k)) return v;
  }
  const iniciais = (nomeBanco ?? "?")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { sigla: iniciais || "?", bg: "#E7E2DC", fg: "#4A4038" };
}
