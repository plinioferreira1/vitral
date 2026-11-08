// Arquivo original fica no navegador (IndexedDB) APENAS neste laboratório.
// No Financeiro real, a versão de produção utilizará storage privado com auditoria.
const BANCO = "vitral-lab-documentos-financeiros-v1";
const ABRIR = () => new Promise((resolve,reject)=>{
  if(!("indexedDB" in window))return reject(new Error("Este navegador não oferece armazenamento local de arquivos."));
  const req=indexedDB.open(BANCO,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("pdfs"))req.result.createObjectStore("pdfs",{keyPath:"id"});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error("Falha ao abrir armazenamento de PDFs."));
});
export async function guardarPDF(arquivo,tipo,referencia) {
  if(!arquivo||arquivo.type!=="application/pdf"&&!/\.pdf$/i.test(arquivo.name))throw new Error("Selecione um PDF.");
  const banco=await ABRIR();
  const id=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
    const tx=banco.transaction("pdfs","readwrite");
    tx.objectStore("pdfs").put({id,arquivo,tipo,referencia,nome:arquivo.name,criadoEm:new Date().toISOString()});
    tx.oncomplete=()=>{banco.close();resolve(id);};
    tx.onerror=()=>{banco.close();reject(tx.error);};
  });
}
export async function abrirPDF(id) {
  const banco=await ABRIR();
  const resultado=await new Promise((resolve,reject)=>{
    const tx=banco.transaction("pdfs","readonly");
    const req=tx.objectStore("pdfs").get(id);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
  banco.close();
  if(!resultado)throw new Error("PDF não está mais armazenado neste navegador.");
  const url=URL.createObjectURL(resultado.arquivo);
  const a=document.createElement("a");a.href=url;a.download=resultado.nome;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function limparPDFs() {
  const db=await ABRIR();await new Promise((res,rej)=>{const tx=db.transaction("pdfs","readwrite");tx.objectStore("pdfs").clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});db.close();
}
