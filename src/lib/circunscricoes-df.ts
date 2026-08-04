// Mapeamento de Região Administrativa (RA) do DF para a
// Circunscrição Judiciária correspondente — usado pra preencher o
// "foro" certo em documentos jurídicos automaticamente, em vez de
// sempre usar "Brasília/DF" fixo.
//
// Fonte oficial: TJDFT — Circunscrições e Regiões Administrativas
// https://www.tjdft.jus.br/informacoes/juizados-especiais/informacoes-gerais/circunscricoes-e-regioes-administrativas
// (consultado em agosto/2026)

export const CIRCUNSCRICAO_POR_RA: Record<string, string> = {
  "Plano Piloto": "Brasília/DF",
  "Cruzeiro": "Brasília/DF",
  "Lago Sul": "Brasília/DF",
  "Lago Norte": "Brasília/DF",
  "Sudoeste/Octogonal": "Brasília/DF",
  "Varjão": "Brasília/DF",
  "Estrutural/SCIA": "Brasília/DF",
  "Jardim Botânico": "Brasília/DF",
  "SIA": "Brasília/DF",
  "Taguatinga": "Taguatinga/DF",
  "Gama": "Gama/DF",
  "Sobradinho": "Sobradinho/DF",
  "Sobradinho II": "Sobradinho/DF",
  "Fercal": "Sobradinho/DF",
  "Planaltina": "Planaltina/DF",
  "Brazlândia": "Brazlândia/DF",
  "Samambaia": "Samambaia/DF",
  "Ceilândia": "Ceilândia/DF",
  "Sol Nascente e Pôr do Sol": "Ceilândia/DF",
  "Paranoá": "Paranoá/DF",
  "Itapoã": "Paranoá/DF", // Itapoã tem fórum próprio, mas a competência ainda é do Paranoá (Resolução 4/2008)
  "Santa Maria": "Santa Maria/DF",
  "São Sebastião": "São Sebastião/DF",
  "Núcleo Bandeirante": "Núcleo Bandeirante/DF",
  "Candangolândia": "Núcleo Bandeirante/DF",
  "Park Way": "Núcleo Bandeirante/DF",
  "Riacho Fundo I": "Riacho Fundo/DF",
  "Riacho Fundo II": "Riacho Fundo/DF",
  "Guará": "Guará/DF",
  "Recanto das Emas": "Recanto das Emas/DF",
  "Águas Claras": "Águas Claras/DF",
  "Vicente Pires": "Águas Claras/DF",
  "Arniqueiras": "Águas Claras/DF",
};

export const REGIOES_ADMINISTRATIVAS_DF = Object.keys(CIRCUNSCRICAO_POR_RA);

export function foroPorRegiaoAdministrativa(ra: string): string {
  return CIRCUNSCRICAO_POR_RA[ra] ?? "Brasília/DF";
}
