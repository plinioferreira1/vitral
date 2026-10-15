/**
 * Vigia de telas presas depois de uma gravação.
 *
 * Sintoma observado em produção: a Server Action termina no servidor (o dado
 * fica salvo), mas a tela continua "Salvando…" para sempre, porque a
 * atualização da página pelo roteador do Next não conclui. Recarregar a página
 * resolve, e é seguro: a gravação já aconteceu e recarregar só lê de novo.
 *
 * Estas funções decidem quando intervir e montam o diagnóstico enviado ao
 * servidor (para descobrirmos a causa com dados reais). Não guardam nem
 * enviam conteúdo de formulário, só metadados da requisição.
 */

/** Depois que a resposta da ação chegou inteira, quanto esperar a tela atualizar. */
export const ESPERA_APOS_RESPOSTA_MS = 10_000;
/** Se a resposta nunca termina de chegar, a partir de quando considerar presa. */
export const ESPERA_MAXIMA_MS = 20_000;
/** Não recarregar sozinho de novo na mesma tela dentro deste intervalo (evita laço). */
export const INTERVALO_ENTRE_RECARGAS_MS = 60_000;

export type AcaoAcompanhada = {
  /** performance.now() quando chegaram os cabeçalhos da resposta */
  cabecalhoEm: number;
  /** performance.now() quando o corpo terminou de chegar (null se ainda não) */
  corpoTerminouEm: number | null;
};

export type DecisaoVigia = "aguardar" | "intervir" | "encerrar";

/**
 * - "encerrar": a tela não está mais ocupada (atualizou normalmente).
 * - "intervir": a tela segue ocupada tempo demais depois da resposta.
 * - "aguardar": ainda dentro do tempo normal.
 */
export function decidirVigia(acao: AcaoAcompanhada, agora: number, telaOcupada: boolean, outrasAcoesEmAndamento: number): DecisaoVigia {
  if (!telaOcupada) return "encerrar";
  // outra gravação começou depois desta: quem decide é a mais nova
  if (outrasAcoesEmAndamento > 0) return "aguardar";
  if (acao.corpoTerminouEm !== null && agora - acao.corpoTerminouEm >= ESPERA_APOS_RESPOSTA_MS) return "intervir";
  if (agora - acao.cabecalhoEm >= ESPERA_MAXIMA_MS) return "intervir";
  return "aguardar";
}

/** Pode recarregar sozinho? Só se não recarregou esta mesma tela há pouco. */
export function podeRecarregarSozinho(ultimaRecarga: { caminho: string; em: number } | null, caminho: string, agoraEpoch: number): boolean {
  if (!ultimaRecarga || ultimaRecarga.caminho !== caminho) return true;
  return agoraEpoch - ultimaRecarga.em >= INTERVALO_ENTRE_RECARGAS_MS;
}

export type DiagnosticoTelaPresa = {
  caminho: string;
  acao: string;
  status: number;
  redirecionamento: string | null;
  revalidou: string | null;
  tipoConteudo: string | null;
  msAteCabecalho: number;
  msAteFimDoCorpo: number | null;
  bytes: number | null;
  corpoInterrompido: boolean;
  msOcupadaAposResposta: number;
  ocupados: string[];
  visivel: boolean;
  recarregouSozinho: boolean;
  /** últimos erros não tratados da página (ex.: falha do React ao atualizar o head) */
  erros: string[];
  /** elementos com id no <head> — extensões do navegador costumam injetar aqui */
  idsNoHead: string[];
};

const limpar = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[^\p{L}\p{N}\s/._:;=?#&%-]/gu, "").slice(0, max) : "");
const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

/** Normaliza o diagnóstico recebido pelo servidor (nunca confiar no que veio do navegador). */
export function normalizarDiagnostico(bruto: unknown): DiagnosticoTelaPresa | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;
  const caminho = limpar(d.caminho, 200);
  if (!caminho.startsWith("/")) return null;
  return {
    caminho,
    acao: limpar(d.acao, 16),
    status: numero(d.status) ?? 0,
    redirecionamento: d.redirecionamento ? limpar(d.redirecionamento, 200) : null,
    revalidou: d.revalidou ? limpar(d.revalidou, 20) : null,
    tipoConteudo: d.tipoConteudo ? limpar(d.tipoConteudo, 60) : null,
    msAteCabecalho: numero(d.msAteCabecalho) ?? 0,
    msAteFimDoCorpo: numero(d.msAteFimDoCorpo),
    bytes: numero(d.bytes),
    corpoInterrompido: d.corpoInterrompido === true,
    msOcupadaAposResposta: numero(d.msOcupadaAposResposta) ?? 0,
    ocupados: Array.isArray(d.ocupados) ? d.ocupados.slice(0, 5).map((o) => limpar(o, 80)) : [],
    visivel: d.visivel === true,
    recarregouSozinho: d.recarregouSozinho === true,
    erros: Array.isArray(d.erros) ? d.erros.slice(0, 3).map((e) => limpar(e, 200)) : [],
    idsNoHead: Array.isArray(d.idsNoHead) ? d.idsNoHead.slice(0, 10).map((e) => limpar(e, 60)) : [],
  };
}
