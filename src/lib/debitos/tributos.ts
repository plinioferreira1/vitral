/**
 * Camada de consulta de tributos imobiliários (IPTU/TLP).
 *
 * Hoje só existe o provedor ASSISTIDO: o Vitral leva a pessoa ao serviço
 * oficial da Receita do DF com a inscrição à mão, e ela registra o
 * resultado. Nenhuma consulta automática é feita.
 *
 * A interface existe para que, se um dia houver uma API que permita
 * legalmente à administradora consultar imóveis de terceiros (com
 * procuração/autorização), baste escrever outro provedor com
 * `automatico: true` e `consultar()` — as telas e o banco não mudam.
 *
 * NÃO implementar aqui raspagem de site, automação de navegador ou uso da
 * API do GDF destinada ao próprio contribuinte sem autorização técnica e
 * jurídica confirmada.
 */

export type DebitoTributo = {
  exercicio: string;
  parcela: string | null;
  vencimento: string | null;
  valor: number | null;
  situacao: string | null;
};

export type ResultadoConsultaTributo = {
  situacao: "sem_debitos" | "com_debitos";
  debitos: DebitoTributo[];
  consultadoEm: string;
};

export interface ProvedorConsultaTributos {
  id: string;
  nome: string;
  /** true quando o provedor consulta sozinho; false quando a conferência é feita por uma pessoa */
  automatico: boolean;
  /** endereço do serviço oficial onde a pessoa faz a consulta */
  urlConsulta(inscricao: string | null): string;
  /** só existe em provedores automáticos autorizados */
  consultar?(inscricao: string, exercicio: number): Promise<ResultadoConsultaTributo>;
}

export const URL_CONSULTA_IPTU_DF = "https://ww1.receita.fazenda.df.gov.br/emissao-segunda-via/iptu";

/** Fluxo assistido: abre o serviço oficial da Receita do DF; o resultado é lançado à mão. */
export function provedorAssistidoDF(urlConfigurada?: string | null): ProvedorConsultaTributos {
  const url = urlConfigurada?.trim() && /^https:\/\//i.test(urlConfigurada.trim()) ? urlConfigurada.trim() : URL_CONSULTA_IPTU_DF;
  return {
    id: "assistido-df",
    nome: "Consulta assistida — Receita do DF",
    automatico: false,
    urlConsulta: () => url,
  };
}

/** Ponto único de escolha do provedor. Hoje, sempre o assistido. */
export function obterProvedorTributos(config?: { url_consulta_iptu?: string | null } | null): ProvedorConsultaTributos {
  return provedorAssistidoDF(config?.url_consulta_iptu);
}

/** Só os dígitos da inscrição, para copiar e colar no site da Receita. */
export function inscricaoParaCopiar(inscricao: string | null | undefined): string {
  return (inscricao ?? "").replace(/\D/g, "");
}
