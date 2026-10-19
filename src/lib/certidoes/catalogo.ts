/**
 * Certidões de "nada consta" das partes de uma venda (funções puras).
 *
 * Emissão assistida: o Vitral NÃO acessa os sites oficiais. A equipe abre o
 * site pelo botão, emite a certidão, anexa o arquivo e o sistema acompanha a
 * validade. Sem scraping, sem automação de CAPTCHA.
 */

export const BUCKET_CERTIDOES = "processos-certidoes";

export const PARTES = ["vendedor", "comprador"] as const;
export type Parte = (typeof PARTES)[number];

export type Certidao = {
  chave: string;
  nome: string;
  orgao: string;
  url: string;
  /** Sugestão de validade quando o documento não informar; a equipe confere a data impressa. */
  validadeDias: number;
};

export const CERTIDOES: readonly Certidao[] = [
  { chave: "tjdft_especial", nome: "Especial (cível)", orgao: "TJDFT", url: "https://cnc.tjdft.jus.br/", validadeDias: 30 },
  { chave: "tjdft_falencias", nome: "Falências e recuperação judicial", orgao: "TJDFT", url: "https://cnc.tjdft.jus.br/", validadeDias: 30 },
  { chave: "trf1_civel", nome: "Cível", orgao: "Justiça Federal (TRF1)", url: "https://sistemas.trf1.jus.br/certidao/#/solicitacao", validadeDias: 30 },
  { chave: "trf1_criminal", nome: "Criminal", orgao: "Justiça Federal (TRF1)", url: "https://sistemas.trf1.jus.br/certidao/#/solicitacao", validadeDias: 30 },
  { chave: "trt10", nome: "Ações trabalhistas", orgao: "TRT 10ª Região", url: "https://pje.trt10.jus.br/certidoes/trabalhista/emissao", validadeDias: 30 },
  { chave: "cndt", nome: "Débitos trabalhistas (CNDT)", orgao: "TST", url: "https://cndt-certidao.tst.jus.br/", validadeDias: 180 },
  { chave: "receita_federal", nome: "Débitos federais e Dívida Ativa da União", orgao: "Receita Federal", url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home", validadeDias: 180 },
  { chave: "receita_df", nome: "Débitos com o Distrito Federal", orgao: "Receita do DF", url: "https://ww1.receita.fazenda.df.gov.br/cidadao/certidoes/Certidao", validadeDias: 30 },
];

export const CHAVES_CERTIDOES = CERTIDOES.map((c) => c.chave);

export const RESULTADOS = ["nada_consta", "positiva"] as const;
export type Resultado = (typeof RESULTADOS)[number];

/** Dias antes do vencimento em que a certidão aparece como "vence em breve". */
export const AVISO_VENCIMENTO_DIAS = 7;

export function certidaoPorChave(chave: string): Certidao | undefined {
  return CERTIDOES.find((c) => c.chave === chave);
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

export function validadeSugerida(chave: string, emitidaEm: string): string | null {
  const c = certidaoPorChave(chave);
  return c ? somarDias(emitidaEm, c.validadeDias) : null;
}

export type Situacao = "pendente" | "vigente" | "vence_em_breve" | "vencida" | "positiva";

export function situacaoCertidao(registro: { valida_ate: string; resultado: string } | null | undefined, hoje: string): Situacao {
  if (!registro) return "pendente";
  if (diasEntre(hoje, registro.valida_ate) < 0) return "vencida";
  if (registro.resultado === "positiva") return "positiva";
  return diasEntre(hoje, registro.valida_ate) <= AVISO_VENCIMENTO_DIAS ? "vence_em_breve" : "vigente";
}

export function diasParaVencer(validaAte: string, hoje: string): number {
  return diasEntre(hoje, validaAte);
}

/** Resumo de uma parte: quantas das 8 estão em dia e o que pede atenção. */
export function resumoParte(registros: { tipo: string; valida_ate: string; resultado: string }[], hoje: string) {
  const porTipo = new Map(registros.map((r) => [r.tipo, r]));
  const contagem: Record<Situacao, number> = { pendente: 0, vigente: 0, vence_em_breve: 0, vencida: 0, positiva: 0 };
  for (const c of CERTIDOES) contagem[situacaoCertidao(porTipo.get(c.chave), hoje)]++;
  return { total: CERTIDOES.length, emDia: contagem.vigente + contagem.vence_em_breve, ...contagem };
}

/** Data informada (aaaa-mm-dd) válida e plausível. */
export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}

/** Confere o que veio do formulário antes de gravar. */
export function validarCertidao(e: { tipo: string; parte: string; emitida_em: string; valida_ate: string; resultado: string }): string | null {
  if (!CHAVES_CERTIDOES.includes(e.tipo)) return "Certidão desconhecida.";
  if (!(PARTES as readonly string[]).includes(e.parte)) return "Parte inválida.";
  if (!(RESULTADOS as readonly string[]).includes(e.resultado)) return "Resultado inválido.";
  if (!dataValida(e.emitida_em)) return "Informe a data de emissão.";
  if (!dataValida(e.valida_ate)) return "Informe a data de validade.";
  if (e.valida_ate < e.emitida_em) return "A validade não pode ser anterior à emissão.";
  return null;
}

/** Só dígitos do CPF/CNPJ, para colar nos sites oficiais. */
export function documentoSoNumeros(doc: string | null | undefined): string {
  return (doc ?? "").replace(/\D/g, "");
}

export type ResumoProcessoCertidoes = {
  id: string;
  titulo: string;
  vendedor: ReturnType<typeof resumoParte>;
  comprador: ReturnType<typeof resumoParte>;
  /** vencidas + vencendo + positivas, somando as duas partes */
  atencao: number;
  pendentes: number;
  proximoVencimento: string | null;
};

/** Painel geral: uma linha por venda, com quem pede atenção primeiro. */
export function resumoProcessos(
  processos: { id: string; titulo: string }[],
  certidoes: { processo_id: string; parte: string; tipo: string; valida_ate: string; resultado: string }[],
  hoje: string,
): ResumoProcessoCertidoes[] {
  const linhas = processos.map((p) => {
    const doProcesso = certidoes.filter((c) => c.processo_id === p.id);
    const vendedor = resumoParte(doProcesso.filter((c) => c.parte === "vendedor"), hoje);
    const comprador = resumoParte(doProcesso.filter((c) => c.parte === "comprador"), hoje);
    const futuras = doProcesso.map((c) => c.valida_ate).filter((d) => d >= hoje).sort();
    return {
      id: p.id,
      titulo: p.titulo,
      vendedor,
      comprador,
      atencao: [vendedor, comprador].reduce((n, r) => n + r.vencida + r.vence_em_breve + r.positiva, 0),
      pendentes: vendedor.pendente + comprador.pendente,
      proximoVencimento: futuras[0] ?? null,
    };
  });
  return linhas.sort((a, b) => b.atencao - a.atencao || a.pendentes - b.pendentes || a.titulo.localeCompare(b.titulo, "pt-BR"));
}
