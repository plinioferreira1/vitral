// Tabelas de emolumentos de cartório fornecidas pela Sacra (faixa
// fixa, não é fórmula progressiva). Já incluem ISSQN. Compartilhadas
// entre a Simulação de Custas e a calculadora de Financiamento, pra
// não ficarem duas cópias que podem desalinhar.

export interface FaixaEmolumento {
  ate: number | null; // null = última faixa, sem limite superior
  valor: number;
}

export const FAIXAS_ESCRITURA: FaixaEmolumento[] = [
  { ate: 9524.89, valor: 461.27 },
  { ate: 15272.67, valor: 701.11 },
  { ate: 28738.89, valor: 1439.13 },
  { ate: 57477.78, valor: 1937.29 },
  { ate: 85888.21, valor: 2029.55 },
  { ate: 200351.09, valor: 2121.8 },
  { ate: 343224.42, valor: 2306.3 },
  { ate: 858882.16, valor: 2490.81 },
  { ate: 1313777.69, valor: 2675.32 },
  { ate: 1806444.32, valor: 2859.81 },
  { ate: null, valor: 3044.32 },
];

export const FAIXAS_REGISTRO: FaixaEmolumento[] = [
  { ate: 32844.44, valor: 701.11 },
  { ate: 82111.11, valor: 885.62 },
  { ate: 164222.21, valor: 1070.12 },
  { ate: 262755.54, valor: 1199.28 },
  { ate: 574777.74, valor: 1383.78 },
  { ate: 870377.72, valor: 1568.29 },
  { ate: 1149555.47, valor: 1752.8 },
  { ate: 1477999.89, valor: 1937.29 },
  { ate: 1970666.52, valor: 2121.8 },
  { ate: null, valor: 2306.3 },
];

export function buscarFaixa(valor: number, faixas: FaixaEmolumento[]): number {
  for (const f of faixas) {
    if (f.ate === null || valor <= f.ate) return f.valor;
  }
  return faixas[faixas.length - 1].valor;
}
