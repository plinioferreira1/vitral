/**
 * Leitura do CSV da fatura do cartão corporativo. Aceita separador ";"
 * ou ",", datas DD/MM/AAAA ou AAAA-MM-DD e valores "1.234,56" ou
 * "1234.56". Colunas esperadas no cabeçalho: data, estabelecimento (ou
 * descrição) e valor; parcela ("2/10") e descrição são opcionais.
 */

export function normalizarData(v: string): string | null {
  v = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const dia = m[1].padStart(2, "0");
    const mes = m[2].padStart(2, "0");
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

export function normalizarValor(v: string): number | null {
  v = v.trim().replace(/^R\$\s?/i, "");
  // aceita "1.234,56" (BR) ou "1234.56" (US)
  if (/,\d{1,2}$/.test(v)) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    v = v.replace(/,/g, "");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function detectarDelimitador(linha: string): string {
  return (linha.match(/;/g)?.length ?? 0) >= (linha.match(/,/g)?.length ?? 0) ? ";" : ",";
}

export type LinhaFatura = {
  data: string;
  estabelecimento: string;
  descricao: string | null;
  valor: number;
  parcela_atual: number | null;
  parcela_total: number | null;
};

export function parseCsvFatura(texto: string): { itens: LinhaFatura[]; erros: string[] } {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (linhas.length === 0) return { itens: [], erros: ["Arquivo vazio."] };

  const delimitador = detectarDelimitador(linhas[0]);
  const cabecalho = linhas[0].split(delimitador).map((c) => c.trim().toLowerCase().replace(/["']/g, ""));
  const idxData = cabecalho.findIndex((c) => c.includes("data"));
  const idxEstab = cabecalho.findIndex((c) => c.includes("estabelec") || c.includes("descri"));
  const idxDescricao = cabecalho.findIndex((c) => c.includes("descri") && c !== cabecalho[idxEstab]);
  const idxValor = cabecalho.findIndex((c) => c.includes("valor"));
  const idxParcela = cabecalho.findIndex((c) => c.includes("parcela"));

  if (idxData === -1 || idxEstab === -1 || idxValor === -1) {
    return {
      itens: [],
      erros: [
        'Não encontrei as colunas "data", "estabelecimento" e "valor" no cabeçalho do arquivo. Confira o formato esperado.',
      ],
    };
  }

  const itens: LinhaFatura[] = [];
  const erros: string[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(delimitador).map((c) => c.trim().replace(/^"|"$/g, ""));
    const data = normalizarData(colunas[idxData] ?? "");
    const estabelecimento = colunas[idxEstab] ?? "";
    const valor = normalizarValor(colunas[idxValor] ?? "");
    if (!data || !estabelecimento || valor === null) {
      erros.push(`Linha ${i + 1}: dados inválidos, ignorada.`);
      continue;
    }
    let parcelaAtual: number | null = null;
    let parcelaTotal: number | null = null;
    if (idxParcela !== -1) {
      const m = (colunas[idxParcela] ?? "").match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        parcelaAtual = Number(m[1]);
        parcelaTotal = Number(m[2]);
      }
    }
    itens.push({
      data,
      estabelecimento,
      descricao: idxDescricao !== -1 ? colunas[idxDescricao] || null : null,
      valor,
      parcela_atual: parcelaAtual,
      parcela_total: parcelaTotal,
    });
  }
  return { itens, erros };
}
