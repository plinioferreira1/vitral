/* Regra de sugestão de preço proposta para o estudo de mercado (comparativo). Função pura. */
import { FATORES, FATOR_OFERTA, HOJE, type Referencia } from "./dados";

export type Linha = Referencia & { m2: number; fator: number; m2Ajustado: number; alertas: string[]; bloqueio?: string };
export type Resultado = {
  linhas: Linha[];
  usadas: Linha[];
  n: number;
  negocios: number;
  mediana: number | null;
  referencia: number | null;
  faixa: [number, number] | null;
  faixaTipo: "extremos" | "quartis" | null;
  cv: number | null;
  estado: "sem_dados" | "insuficiente" | "ok" | "disperso";
};

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/apartamento|apto|ap\.?/g, "apto").replace(/[^a-z0-9]+/g, " ").trim();
const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); const m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
const quartil = (v: number[], q: number) => { const o = [...v].sort((a, b) => a - b); const p = (o.length - 1) * q; const b = Math.floor(p); return o[b] + (o[Math.min(b + 1, o.length - 1)] - o[b]) * (p - b); };
const dias = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);
export const arredondar = (v: number) => Math.round(v / (v >= 1_000_000 ? 5000 : 1000)) * (v >= 1_000_000 ? 5000 : 1000);

export function calcular(refs: Referencia[], imovel: { endereco: string; area: number }, oferta = FATOR_OFERTA): Resultado {
  const alvo = normalizar(imovel.endereco);
  const linhas: Linha[] = refs.map((r) => {
    const m2 = r.preco / r.area;
    // Referência "melhor" que o imóvel avaliado tem o preço reduzido; "pior", aumentado.
    let fator = r.tipoPreco === "anuncio" ? oferta : 1;
    for (const f of FATORES) fator *= 1 - (r.ajustes[f.chave] ?? 0) * (f.pct / 100);
    const alertas: string[] = [];
    let bloqueio: string | undefined;
    if (normalizar(r.endereco) === alvo) bloqueio = "É o próprio imóvel avaliado: não pode entrar no cálculo.";
    const difArea = Math.abs(r.area - imovel.area) / imovel.area;
    if (difArea > 0.3) alertas.push(`Área ${Math.round(difArea * 100)}% diferente`);
    if (dias(r.data, HOJE) > 90) alertas.push("Consulta com mais de 90 dias");
    if (fator < 0.8 || fator > 1.25) alertas.push("Ajuste total fora de 0,80–1,25");
    return { ...r, m2, fator, m2Ajustado: m2 * fator, alertas, bloqueio };
  });
  // duplicatas: mesmo endereço normalizado entre referências
  const vistos = new Map<string, string>();
  for (const l of linhas) {
    const k = normalizar(l.endereco);
    if (vistos.has(k) && !l.bloqueio) l.alertas.push("Possível duplicata");
    else vistos.set(k, l.id);
  }
  const usadas = linhas.filter((l) => l.usar && !l.bloqueio);
  const n = usadas.length;
  const base: Resultado = { linhas, usadas, n, negocios: usadas.filter((l) => l.tipoPreco === "negocio").length, mediana: null, referencia: null, faixa: null, faixaTipo: null, cv: null, estado: n === 0 ? "sem_dados" : "insuficiente" };
  if (n < 3) return base;
  const v = usadas.map((l) => l.m2Ajustado);
  const med = mediana(v);
  const media = v.reduce((s, x) => s + x, 0) / n;
  const cv = Math.sqrt(v.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1)) / media;
  const [a, b] = n >= 8 ? [quartil(v, 0.25), quartil(v, 0.75)] : [Math.min(...v), Math.max(...v)];
  return {
    ...base,
    mediana: med,
    referencia: arredondar(med * imovel.area),
    faixa: [arredondar(a * imovel.area), arredondar(b * imovel.area)],
    faixaTipo: n >= 8 ? "quartis" : "extremos",
    cv,
    estado: cv > 0.25 ? "disperso" : "ok",
  };
}
