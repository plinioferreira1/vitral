/**
 * Importação de comparáveis por planilha (CSV), para dados exportados de
 * uma fonte externa autorizada ou montados à mão. Não busca nada na
 * internet: só lê o texto que a pessoa colou/enviou.
 *
 * Cabeçalho aceito (a ordem não importa; só "identificação" é obrigatória):
 *   identificacao; regiao; area; quartos; suites; vagas; preco;
 *   tipo_preco (oferta|transacao); link; data_consulta; status; observacoes
 */

import { detectarDelimitador, normalizarData, normalizarValor } from "@/lib/fatura-csv";

export type ComparavelImportado = {
  identificacao: string;
  regiao: string | null;
  area_m2: number | null;
  quartos: number | null;
  suites: number | null;
  vagas: number | null;
  preco: number | null;
  tipo_preco: "oferta" | "transacao";
  fonte_url: string | null;
  data_coleta: string | null;
  status_anuncio: string | null;
  observacoes: string | null;
};

export const MODELO_CSV_COMPARAVEIS =
  "identificacao;regiao;area;quartos;suites;vagas;preco;tipo_preco;link;data_consulta;status;observacoes";

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/["']/g, "")
    .trim();
}

/** Divide uma linha respeitando campos entre aspas. */
export function dividirLinhaCsv(linha: string, delimitador: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        aspas = !aspas;
      }
    } else if (ch === delimitador && !aspas) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += ch;
    }
  }
  campos.push(atual.trim());
  return campos;
}

function inteiro(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = parseInt(valor.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function numeroPositivo(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = normalizarValor(valor.replace(/m²|m2/gi, "").trim());
  return n !== null && n > 0 ? n : null;
}

export function parseCsvComparaveis(texto: string): { itens: ComparavelImportado[]; erros: string[] } {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (linhas.length < 2) return { itens: [], erros: ["Cole o cabeçalho e pelo menos uma linha de dados."] };

  const delimitador = linhas[0].includes("\t") ? "\t" : detectarDelimitador(linhas[0]);
  const cabecalho = dividirLinhaCsv(linhas[0], delimitador).map(semAcento);
  const indice = (...nomes: string[]) => cabecalho.findIndex((c) => nomes.some((n) => c === n || c.startsWith(n)));

  const col = {
    identificacao: indice("identificacao", "referencia", "endereco", "imovel", "titulo"),
    regiao: indice("regiao", "bairro"),
    area: indice("area"),
    quartos: indice("quartos", "dormitorios"),
    suites: indice("suites", "suite"),
    vagas: indice("vagas", "garagem"),
    preco: indice("preco", "valor"),
    tipoPreco: indice("tipo_preco", "tipo de preco", "tipo"),
    link: indice("link", "url"),
    data: indice("data_consulta", "data de consulta", "data"),
    status: indice("status"),
    observacoes: indice("observacoes", "observacao", "obs"),
  };
  if (col.identificacao < 0) {
    return { itens: [], erros: ['Não encontrei a coluna "identificacao" no cabeçalho.'] };
  }

  const itens: ComparavelImportado[] = [];
  const erros: string[] = [];
  linhas.slice(1).forEach((linha, i) => {
    const campos = dividirLinhaCsv(linha, delimitador);
    const pegar = (idx: number) => (idx >= 0 ? campos[idx]?.trim() || undefined : undefined);
    const identificacao = pegar(col.identificacao);
    if (!identificacao) {
      erros.push(`Linha ${i + 2}: sem identificação — ignorada.`);
      return;
    }
    const dataTexto = pegar(col.data);
    const data = dataTexto ? normalizarData(dataTexto) : null;
    if (dataTexto && !data) erros.push(`Linha ${i + 2}: data "${dataTexto}" não reconhecida — ficou em branco.`);
    const link = pegar(col.link);
    if (link && !/^https?:\/\//i.test(link)) erros.push(`Linha ${i + 2}: o link não começa com http(s) — confira.`);
    const tipo = semAcento(pegar(col.tipoPreco) ?? "");
    itens.push({
      identificacao: identificacao.slice(0, 200),
      regiao: pegar(col.regiao) ?? null,
      area_m2: numeroPositivo(pegar(col.area)),
      quartos: inteiro(pegar(col.quartos)),
      suites: inteiro(pegar(col.suites)),
      vagas: inteiro(pegar(col.vagas)),
      preco: numeroPositivo(pegar(col.preco)),
      tipo_preco: tipo.startsWith("transa") || tipo.startsWith("venda realizada") || tipo.startsWith("fech") ? "transacao" : "oferta",
      fonte_url: link ?? null,
      data_coleta: data,
      status_anuncio: pegar(col.status) ?? null,
      observacoes: pegar(col.observacoes) ?? null,
    });
  });
  return { itens, erros };
}
