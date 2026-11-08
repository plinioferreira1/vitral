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

export function extratoEditavel(transacoes) {
  return transacoes.map(t=>[t.data,t.memo.replace(/[;\t\n]+/g," "),(t.valor/100).toFixed(2).replace(".",",")].join(";")).join("\n");
}
export function lerExtratoEditado(texto) {
  const linhas=String(texto??"").split(/\r?\n/).filter(Boolean), transacoes=[], erros=[], vistos=new Map();
  linhas.forEach((linha,indice)=>{
    const [data,memo,montante,...extras]=linha.split(";");
    const valor=valorCentavos(montante);
    if(extras.length||!/\d{4}-\d{2}-\d{2}/.test(data||"")||!memo?.trim()||!Number.isFinite(valor)||valor===0) {
      erros.push("Linha "+(indice+1)+": use AAAA-MM-DD;descrição;valor (negativo para saída).");
      return;
    }
    const chave=data+"|"+valor+"|"+memo.trim().toLowerCase();
    const ocorrencia=(vistos.get(chave)||0)+1; vistos.set(chave,ocorrencia);
    transacoes.push({fitid:"pdf:"+chave+":"+ocorrencia,data,valor,memo:memo.trim()});
  });
  return {transacoes,erros,conta:"PDF (conferir)",inicio:transacoes[0]?.data??"",fim:transacoes.at(-1)?.data??"",saldo:null};
}


// Banco Inter: layout efetivamente testado com extrato de ago–nov/2026 e fatura out/2026.
// Mantém cada ocorrência, inclusive pagamentos de mesmo valor na mesma data.
const MES_INTER = { janeiro:1, fevereiro:2, marco:3, abril:4, maio:5, junho:6, julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12,
  jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };
const mesInter = (x) => MES_INTER[String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\.$/,"")];
const dataInter = (d,m,a) => {
  const mes = mesInter(m); return mes ? [a,String(mes).padStart(2,"0"),String(d).padStart(2,"0")].join("-") : "";
};
const centavosInter = (v) => {
  const n = /(-?)\s*R\$\s*([\d.]+,\d{2})/.exec(v);
  return n ? (n[1]==="-"?-1:1)*Number(n[2].replace(/\./g,"").replace(",","")) : NaN;
};
export function extratoInterPDF(linhas) {
  const cabecalho = linhas.some(l=>/Banco Inter|Saldo por transa[cç][aã]o/i.test(l));
  if (!cabecalho) throw new Error("PDF de extrato não reconhecido como Banco Inter.");
  let dia="", saldoCabecalho=null;
  const transacoes=[], ocor=new Map(), ignoradas=[];
  for (const l of linhas) {
    const data=/(\d{1,2}) de ([A-Za-zÀ-ÿ]+) de (20\d{2})\s+Saldo do dia/i.exec(l);
    if (data) dia=dataInter(data[1],data[2],data[3]);
    const saldo=l.match(/(?:Saldo total|Saldo dispon[ií]vel)\s*:?\s*R\$\s*([\d.]+,\d{2})/i);
    if (saldo && saldoCabecalho===null) saldoCabecalho=centavosInter("R$ "+saldo[1]);
    if (!dia) continue;
    const m=/^(.+?)\s+(-?R\$\s*[\d.]+,\d{2})\s+(-?R\$\s*[\d.]+,\d{2})\s*$/.exec(l);
    if (!m) continue;
    if (!/^(Pix |Pagamento |Transfer[eê]ncia |DARF |Tarifa |Cr[eé]dito |D[eé]bito )/i.test(m[1])) continue;
    const valor=centavosInter(m[2]), saldoApos=centavosInter(m[3]);
    if (!Number.isSafeInteger(valor)||!Number.isSafeInteger(saldoApos)) {ignoradas.push(l);continue;}
    const memo=m[1].trim(), chave=dia+"|"+valor+"|"+saldoApos+"|"+memo;
    const seq=(ocor.get(chave)||0)+1;ocor.set(chave,seq);
    transacoes.push({data:dia,valor,memo,fitid:"pdf:inter:"+chave+"|"+seq,saldoApos,
      pagamentoFatura:/fatura.*cart[aã]o.*inter|debito automatico fatura/i.test(memo)});
  }
  if (!transacoes.length) throw new Error("Não foram encontradas movimentações nesse extrato do Inter.");
  const ultimo=transacoes.at(-1);
  const inconsistencias=[];
  for (let i=1;i<transacoes.length;i++) {
    const anterior=transacoes[i-1],atual=transacoes[i];
    if(anterior.saldoApos+atual.valor!==atual.saldoApos)
      inconsistencias.push({data:atual.data,memo:atual.memo,diferenca:atual.saldoApos-anterior.saldoApos-atual.valor});
  }
  if(saldoCabecalho===null)saldoCabecalho=ultimo.saldoApos;
  return {inconsistencias,transacoes,ignoradas,conta:"Banco Inter (PDF)",inicio:transacoes[0].data,fim:ultimo.data,
    saldo:saldoCabecalho===null?null:{data:ultimo.data,valor:saldoCabecalho},formato:"PDF Banco Inter"};
}
export function faturaInterPDF(linhas) {
  if (!linhas.some(l=>/Despesas da fatura/i.test(l)) || !linhas.some(l=>/CART[AÃ]O\s+\d{4}\*+/i.test(l)))
    throw new Error("PDF de fatura não reconhecido como Banco Inter.");
  let cartao="",vencimento="",total=null;
  const compras=[],ignoradas=[];
  for(const l of linhas){
    const c=/^CART[AÃ]O\s+(\d{4}\*{4}\d{4})/i.exec(l);
    if(c) cartao=c[1];
    const cab=/\b(\d{2})\/(\d{2})\/(20\d{2})\s+R\$\s*([\d.]+,\d{2})\b/.exec(l);
    if(cab&&!vencimento){vencimento=cab[3]+"-"+cab[2]+"-"+cab[1];total=centavosInter("R$ "+cab[4]);}
    const dt=/^(\d{1,2}) de ([a-zçà-ÿ]{3,})\.?\s+(20\d{2})\s+(.+)$/i.exec(l);
    if(!dt||!cartao)continue;
    const data=dataInter(dt[1],dt[2],dt[3]);
    const v=/(?:\+\s*)?R\$\s*([\d.]+,\d{2})\s*$/.exec(dt[4]);
    if(!v||!data){ignoradas.push(l);continue;}
    const descricao=dt[4].slice(0,v.index).replace(/\s+-\s*$/,"").trim();
    if(/^(PAGTO|PAGAMENTO|ESTORNO|CR[EÉ]DITO)/i.test(descricao))continue;
    const parcela=/\(\s*Parcela\s+(\d+)\s+de\s+(\d+)\s*\)/i.exec(descricao);
    compras.push({data,loja:descricao,valor:centavosInter("R$ "+v[1]),
      parcela:parcela?Number(parcela[1]):1,parcelas:parcela?Number(parcela[2]):1,cartao});
  }
  if(!compras.length)throw new Error("Nenhuma despesa foi identificada na fatura do Inter.");
  const soma=compras.reduce((s,c)=>s+c.valor,0);
  return {compras,ignoradas,vencimento,competencia:vencimento.slice(0,7),total,soma,
    confere:total!==null&&soma===total,cartoes:[...new Set(compras.map(c=>c.cartao))]};
}
