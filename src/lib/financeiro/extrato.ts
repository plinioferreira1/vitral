/**
 * Extratos bancários e conciliação (funções puras, valores em centavos).
 *
 * - lerOFX: OFX 1.x (SGML) e 2.x (XML), como os bancos exportam.
 * - lerExtratoInter: texto do PDF de extrato do Banco Inter (pdftotext -layout).
 * - sugestoes: lançamentos em aberto que combinam com uma linha do extrato.
 * - conferirConciliacao: a soma dos saldos escolhidos tem de bater com a linha.
 */

export type LinhaExtrato = { chave: string; data: string; valorCentavos: number; descricao: string };
export type ExtratoLido = {
  banco: string;
  conta: string;
  inicio: string | null;
  fim: string | null;
  saldo: { valorCentavos: number; data: string } | null;
  linhas: LinhaExtrato[];
};

export class ErroExtrato extends Error {}

/** "1.234,56" | "1234.56" | "-50,00" → centavos */
export function centavosDe(texto: string): number {
  const t = texto.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  const normal = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normal)) return NaN;
  return Math.round(Number(normal) * 100);
}

const dataOFX = (v: string) => (/^\d{8}/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : "");

export function lerOFX(texto: string): ExtratoLido {
  const txt = String(texto ?? "");
  if (!/<OFX>/i.test(txt)) throw new ErroExtrato("O arquivo não parece um extrato OFX.");
  const campo = (bloco: string, nome: string) => bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";
  const linhas: LinhaExtrato[] = [];
  const vistas = new Map<string, number>();
  for (const bruto of txt.split(/<STMTTRN>/i).slice(1)) {
    const bloco = bruto.split(/<\/STMTTRN>/i)[0];
    const valor = centavosDe(campo(bloco, "TRNAMT"));
    const data = dataOFX(campo(bloco, "DTPOSTED"));
    if (!Number.isFinite(valor) || valor === 0 || !data) continue;
    const descricao = (campo(bloco, "MEMO") || campo(bloco, "NAME") || "Sem descrição").slice(0, 300);
    let chave = campo(bloco, "FITID");
    if (!chave) {
      const base = `${data}|${valor}|${descricao}`;
      const n = (vistas.get(base) ?? 0) + 1;
      vistas.set(base, n);
      chave = `${base}|${n}`;
    }
    linhas.push({ chave: chave.slice(0, 200), data, valorCentavos: valor, descricao });
  }
  const ledger = txt.split(/<LEDGERBAL>/i)[1] ?? "";
  const saldoValor = ledger ? centavosDe(campo(ledger, "BALAMT")) : NaN;
  return {
    banco: campo(txt, "BANKID") || campo(txt, "ORG"),
    conta: campo(txt, "ACCTID"),
    inicio: dataOFX(campo(txt, "DTSTART")) || null,
    fim: dataOFX(campo(txt, "DTEND")) || null,
    saldo: Number.isFinite(saldoValor) ? { valorCentavos: saldoValor, data: dataOFX(campo(ledger, "DTASOF")) } : null,
    linhas,
  };
}

const MESES: Record<string, string> = {
  janeiro: "01", fevereiro: "02", marco: "03", março: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

/**
 * Texto do PDF do Banco Inter ("pdftotext -layout"). Cada dia começa com
 * "1 de Setembro de 2026 Saldo do dia: R$ ..." e cada movimento traz o
 * valor e o saldo após a transação. A chave inclui a ordem no dia para que
 * dois movimentos iguais no mesmo dia não se confundam.
 */
export function lerExtratoInter(texto: string): ExtratoLido {
  let dia = "";
  let ordem = 0;
  const linhas: LinhaExtrato[] = [];
  let ultimoSaldo: number | null = null;
  const conta = texto.match(/Conta:\s*([\d-]+)/)?.[1] ?? "";
  const periodo = texto.match(/Período:\s*(\d{2})\/(\d{2})\/(\d{4})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/);
  for (const l of texto.split(/\r?\n/)) {
    const d = l.match(/^\s*(\d{1,2}) de ([A-Za-zçÇ]+) de (\d{4}) Saldo do dia/i);
    if (d) {
      const mes = MESES[d[2].toLowerCase()];
      dia = mes ? `${d[3]}-${mes}-${d[1].padStart(2, "0")}` : "";
      ordem = 0;
      continue;
    }
    const m = l.match(/^\s*(.+?)\s{2,}(-?)R\$\s?([\d.]+,\d{2})\s{2,}(-?)R\$\s?([\d.]+,\d{2})\s*$/);
    if (!m || !dia) continue;
    const valor = centavosDe(m[3]) * (m[2] ? -1 : 1);
    ultimoSaldo = centavosDe(m[5]) * (m[4] ? -1 : 1);
    ordem++;
    const descricao = m[1].trim().slice(0, 300);
    linhas.push({ chave: `inter|${dia}|${ordem}|${valor}`, data: dia, valorCentavos: valor, descricao });
  }
  if (!linhas.length) throw new ErroExtrato("Não encontrei movimentos neste extrato.");
  return {
    banco: "Banco Inter",
    conta,
    inicio: periodo ? `${periodo[3]}-${periodo[2]}-${periodo[1]}` : linhas[0].data,
    fim: periodo ? `${periodo[6]}-${periodo[5]}-${periodo[4]}` : linhas.at(-1)!.data,
    saldo: ultimoSaldo === null ? null : { valorCentavos: ultimoSaldo, data: linhas.at(-1)!.data },
    linhas,
  };
}

/** O saldo inicial + movimentos tem de chegar ao saldo final informado (confere se a leitura não perdeu linhas). */
export function conferirSaldos(saldoInicialCentavos: number, linhas: LinhaExtrato[], saldoFinalCentavos: number): boolean {
  return saldoInicialCentavos + linhas.reduce((s, l) => s + l.valorCentavos, 0) === saldoFinalCentavos;
}

export type LancamentoAberto = {
  id: string;
  tipo: string;
  descricao: string;
  pessoa: string | null;
  vencimento: string;
  saldoCentavos: number;
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const diasEntre = (a: string, b: string) => Math.round(Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 864e5);
const PALAVRAS_VAZIAS = new Set(["pix", "enviado", "recebido", "pagamento", "efetuado", "titulo", "transferencia", "ltda", "cp"]);

/** Até 4 lançamentos em aberto que combinam com a linha: mesmo sentido, valor igual ou nome parecido, perto da data. */
export function sugestoes(linha: { data: string; valorCentavos: number; descricao: string }, abertos: LancamentoAberto[]) {
  const tipo = linha.valorCentavos > 0 ? "receita" : "despesa";
  const alvo = Math.abs(linha.valorCentavos);
  const palavras = semAcento(linha.descricao).split(/[^a-z0-9]+/).filter((p) => p.length > 3 && !PALAVRAS_VAZIAS.has(p));
  return abertos
    .filter((l) => l.tipo === tipo && l.saldoCentavos > 0)
    .map((l) => {
      const dias = diasEntre(l.vencimento, linha.data);
      const texto = semAcento(`${l.descricao} ${l.pessoa ?? ""}`);
      const nome = palavras.some((p) => texto.includes(p));
      const exato = l.saldoCentavos === alvo;
      const pontos = (exato ? 60 : 0) + Math.max(0, 25 - dias * 2) + (nome ? 20 : 0);
      return { lancamento: l, dias, exato, nome, pontos };
    })
    .filter((s) => (s.exato && s.dias <= 45) || (s.nome && s.dias <= 15 && s.lancamento.saldoCentavos >= alvo))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 4);
}

/** A conciliação só fecha se a soma dos saldos escolhidos for exatamente o valor da linha. */
export function conferirConciliacao(valorLinhaCentavos: number, escolhidos: { tipo: string; saldoCentavos: number }[]): string | null {
  if (!escolhidos.length) return "Escolha ao menos um lançamento.";
  const tipo = valorLinhaCentavos > 0 ? "receita" : "despesa";
  if (escolhidos.some((e) => e.tipo !== tipo)) return "Receita e despesa não se misturam na mesma conciliação.";
  const soma = escolhidos.reduce((s, e) => s + e.saldoCentavos, 0);
  if (soma !== Math.abs(valorLinhaCentavos)) {
    const f = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return `A soma escolhida (${f(soma)}) não bate com a linha do extrato (${f(Math.abs(valorLinhaCentavos))}).`;
  }
  return null;
}

/** Nome limpo para sugerir como descrição do lançamento criado a partir da linha. */
export function descricaoSugerida(descricao: string): string {
  const m = descricao.match(/"(.*)"/);
  const dentro = (m ? m[1] : descricao).replace(/^Cp\s*:\s*\d+-/i, "").replace(/^\d{5}\s+\d+\s+/, "").trim();
  const tipo = descricao.split(":")[0].trim();
  return dentro ? `${dentro}${tipo && tipo !== dentro ? ` (${tipo})` : ""}`.slice(0, 120) : descricao.slice(0, 120);
}
