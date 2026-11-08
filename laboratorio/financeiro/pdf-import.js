// Extração local e conservadora: PDFs bancários têm layouts diferentes.
// NUNCA confirmar lançamentos automaticamente sem a prévia visível.
const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/";
export async function textoPDF(arquivo) {
  if (!arquivo || arquivo.type !== "application/pdf" && !/\.pdf$/i.test(arquivo.name)) throw new Error("Selecione um PDF válido.");
  if (arquivo.size > 12 * 1024 * 1024) throw new Error("O PDF deve ter no máximo 12 MB.");
  const pdfjs = await import(PDFJS + "pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  try {
    if (pdf.numPages > 40) throw new Error("Para conferência, envie um PDF de até 40 páginas.");
    const linhas = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const texto = await pagina.getTextContent();
      // Reconstrução visual aproximada das linhas; PDFs sem camada de texto exigem OCR.
      const porLinha = new Map();
      for (const item of texto.items) {
        if (!item.str?.trim()) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const linha = porLinha.get(y) || [];
        linha.push({ x: item.transform[4], t: item.str.trim() });
        porLinha.set(y, linha);
      }
      for (const [, fragmentos] of [...porLinha.entries()].sort((a,b)=>b[0]-a[0])) {
        const textoLinha = fragmentos.sort((a,b)=>a.x-b.x).map(f=>f.t).join(" ").replace(/\s+/g," ").trim();
        if (textoLinha) linhas.push(textoLinha);
      }
    }
    if (!linhas.length) throw new Error("O PDF parece digitalizado ou protegido. Envie OFX/CSV ou um PDF com texto selecionável.");
    return linhas;
  } finally { await pdf.destroy(); }
}

const dataISO = (d) => {
  const m = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/.exec(d);
  if (!m) return "";
  const ano = m[3] || String(new Date().getFullYear());
  const iso = ano+"-"+m[2]+"-"+m[1];
  const dt = new Date(iso+"T12:00:00Z");
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0,10)===iso ? iso : "";
};
const valorCentavos = (s) => {
  const x=String(s).replace(/R\$\s*/gi,"").replace(/\./g,"").replace(",",".").replace(/\s/g,"");
  if (!/^-?\d+\.\d{2}$/.test(x)) return NaN;
  return Math.round(Number(x)*100);
};
const VALOR = "(?:R\\$\\s*)?-?[\\d.]+,\\d{2}";
export function linhasFaturaPDF(linhas) {
  const compras=[], ignoradas=[];
  for(const linha of linhas) {
    const m = new RegExp("^(\\d{2}\\/\\d{2}(?:\\/\\d{4})?)\\s+(.+?)\\s+("+VALOR+")(?:\\s*[DC])?$","i").exec(linha);
    if(!m) { if(/\d{2}\/\d{2}/.test(linha) && /\d+,\d{2}/.test(linha)) ignoradas.push(linha); continue; }
    const iso=dataISO(m[1]), valor=valorCentavos(m[3]);
    if(!iso || !Number.isFinite(valor) || valor<=0 || /^(pagamento|credito|crédito|total|saldo|estorno)\b/i.test(m[2])) continue;
    const parc=/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/.exec(m[2]);
    const loja=m[2].trim();
    compras.push({data:iso,loja,valor,parcela:parc?Number(parc[1]):1,parcelas:parc?Number(parc[2]):1});
  }
  return {compras,ignoradas};
}
export function linhasExtratoPDF(linhas) {
  const transacoes=[], ignoradas=[], repetidas=new Map();
  for(const linha of linhas) {
    const m=new RegExp("^(\\d{2}\\/\\d{2}(?:\\/\\d{4})?)\\s+(.+?)\\s+("+VALOR+")\\s*([DC])?$","i").exec(linha);
    if(!m) { if(/\d{2}\/\d{2}/.test(linha)&&/\d+,\d{2}/.test(linha)) ignoradas.push(linha); continue; }
    const data=dataISO(m[1]), bruto=valorCentavos(m[3]), indicador=m[4]?.toUpperCase();
    if(!data || !Number.isFinite(bruto) || /\b(total|saldo|limite|anterior)\b/i.test(m[2])) continue;
    // Sem sinal ou coluna D/C identificável, não é seguro adivinhar débito/crédito.
    if(!indicador && !/[-]/.test(m[3])) {ignoradas.push(linha+" (confira o sentido do lançamento)");continue;}
    const valor=indicador==="D"?-Math.abs(bruto):indicador==="C"?Math.abs(bruto):bruto;
    if(!valor) continue;
    const memo=m[2].trim(), chave=data+"|"+valor+"|"+memo.toLowerCase();
    const ocorrencia=(repetidas.get(chave)||0)+1;repetidas.set(chave,ocorrencia);
    transacoes.push({fitid:"pdf:"+chave+":"+ocorrencia,data,valor,memo});
  }
  return {transacoes,ignoradas,conta:"PDF (conferir)",inicio:transacoes[0]?.data??"",fim:transacoes.at(-1)?.data??"",saldo:null};
}
export function csvFaturaEditavel(compras) {
  return compras.map(c=>[c.data,c.loja.replace(/[;\t\n]+/g," "), (c.valor/100).toFixed(2).replace(".",","), c.parcelas>1?c.parcela+"/"+c.parcelas:""].join(";")).join("\n");
}
