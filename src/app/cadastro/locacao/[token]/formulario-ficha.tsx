"use client";

import { useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, FileUp, Info, Loader2, ShieldCheck } from "lucide-react";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
import { createClient } from "@/lib/supabase/client";
import {
  ACEITE, DECLARACAO, DOCUMENTACAO_NECESSARIA, DOCUMENTACAO_POR_OCUPACAO, ETAPAS, ETAPA_DECLARACAO, ETAPA_DOCUMENTOS, GARANTIAS, LIMITE_ARQUIVOS, ROTULO_TIPO,
  anexosDe, pendencias, secoesVisiveis, textoPendencias, type CampoVisivel, type DadosFicha, type TipoLocatario,
} from "@/lib/ficha-locacao/campos";
import { confirmarUpload, finalizarFicha, prepararUpload, salvarRascunho } from "./actions";

type Documento = { id: string; nome_arquivo: string; tipo: string };
/** Resumo da proposta do titular, mostrado a quem é fiador ou corresponsável. */
export type PropostaDoTitular = { titular: string; imovel: string; garantia: string };

const CAMPO = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-[#731515] focus:ring-2 focus:ring-[#731515]/10";

function mascaraCpf(v: string) { return v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
function mascaraTelefone(v: string) { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3"); }
function mascaraCep(v: string) { return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
function mascaraMoeda(v: string) { const n = Number(v.replace(/\D/g, "")) / 100; return n ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""; }
const MASCARAS: Partial<Record<NonNullable<CampoVisivel["formato"]>, (v: string) => string>> = { cpf: mascaraCpf, telefone: mascaraTelefone, cep: mascaraCep, moeda: mascaraMoeda };
const TIPO_INPUT: Partial<Record<NonNullable<CampoVisivel["formato"]>, string>> = { data: "date", email: "email", telefone: "tel" };
const MODO_TECLADO: Partial<Record<NonNullable<CampoVisivel["formato"]>, "numeric" | "email" | "tel">> = { cpf: "numeric", cep: "numeric", moeda: "numeric", email: "email", telefone: "tel" };

export function FormularioFicha({ token, tipo, proposta, iniciais, documentosIniciais, etapaInicial = 0 }: { etapaInicial?: number; token: string; tipo: TipoLocatario; proposta: PropostaDoTitular | null; iniciais: DadosFicha; documentosIniciais: Documento[] }) {
  const [etapa, setEtapa] = useState(etapaInicial), [dados, setDados] = useState<DadosFicha>(iniciais);
  const [documentos, setDocumentos] = useState(documentosIniciais), [assinatura, setAssinatura] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState(""), [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [comErro, setComErro] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();
  const garantia = tipo === "titular" ? String(dados.garantia ?? "") : (proposta?.garantia ?? "");
  const ultima = ETAPAS.length - 1;

  function atualizar(nome: string, valor: string | boolean) {
    setDados((atual) => ({ ...atual, [nome]: valor }));
    if (comErro.has(nome)) setComErro((atual) => { const novo = new Set(atual); novo.delete(nome); return novo; });
  }

  function campo(c: CampoVisivel) {
    const valor = String(dados[c.chave] ?? "");
    const erro = comErro.has(c.chave);
    const classe = `${CAMPO} ${erro ? "border-rose-400 bg-rose-50/40" : ""}`;
    const mascara = c.formato ? MASCARAS[c.formato] : undefined;
    return <label key={c.chave} className={`block min-w-0 text-sm font-medium text-stone-700 ${c.larga ? "sm:col-span-2" : ""}`}>
      {c.rotulo}{c.exigido && <span className="text-[#731515]"> *</span>}
      {c.formato === "lista" ? <select className={classe} value={valor} onChange={(e) => atualizar(c.chave, e.target.value)}><option value="">Selecione</option>{c.opcoes?.map((o) => <option key={o}>{o}</option>)}</select>
        : c.formato === "longo" ? <textarea className={`${classe} min-h-24`} value={valor} maxLength={2000} onChange={(e) => atualizar(c.chave, e.target.value)} />
        : <input className={classe} type={(c.formato && TIPO_INPUT[c.formato]) || "text"} inputMode={c.formato ? MODO_TECLADO[c.formato] : undefined} maxLength={300} value={valor} onChange={(e) => atualizar(c.chave, mascara ? mascara(e.target.value) : e.target.value)} />}
      {c.ajuda && <span className="mt-1 block text-xs font-normal text-stone-500">{c.ajuda}</span>}
    </label>;
  }

  function salvarEIr(proxima: number) {
    setMensagem("");
    iniciar(async () => {
      // O progresso é gravado mesmo com campos faltando; só não avança.
      const r = await salvarRascunho(token, dados);
      if (!r.ok) { setMensagem(r.erro ?? "Não foi possível salvar."); return; }
      const faltas = pendencias(dados, tipo, etapa);
      if (faltas.length > 0) { setComErro(new Set(faltas.map((f) => f.chave))); setMensagem(textoPendencias(faltas)); return; }
      setComErro(new Set()); setEtapa(proxima); window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function enviarArquivo(file: File, tipoAnexo: string) {
    setMensagem(""); setEnviandoArquivo(true);
    try {
      const p = await prepararUpload(token, file.name, file.type, file.size);
      if (!p.ok || !p.caminho || !p.uploadToken) throw new Error(p.erro);
      const { error } = await createClient().storage.from("fichas-locacao").uploadToSignedUrl(p.caminho, p.uploadToken, file, { contentType: file.type });
      if (error) throw error;
      const c = await confirmarUpload(token, { caminho: p.caminho, nome: file.name, mime: file.type, tamanho: file.size, tipo: tipoAnexo });
      if (!c.ok) throw new Error(c.erro);
      setDocumentos((a) => [...a, { id: p.caminho!, nome_arquivo: file.name, tipo: tipoAnexo }]);
    } catch (e) { setMensagem(e instanceof Error ? e.message : "Não foi possível enviar o arquivo."); } finally { setEnviandoArquivo(false); }
  }
  async function enviarArquivos(files: FileList | null, tipoAnexo: string) {
    if (!files) return;
    const vagas = LIMITE_ARQUIVOS - documentos.length;
    if (vagas <= 0) { setMensagem(`O limite de ${LIMITE_ARQUIVOS} arquivos já foi atingido.`); return; }
    const selecionados = Array.from(files);
    if (selecionados.length > vagas) setMensagem(`Você pode enviar somente mais ${vagas} arquivo${vagas === 1 ? "" : "s"}.`);
    for (const file of selecionados.slice(0, vagas)) await enviarArquivo(file, tipoAnexo);
  }

  function concluir() {
    setMensagem("");
    const faltas = pendencias(dados, tipo);
    if (faltas.length > 0) { setComErro(new Set(faltas.map((f) => f.chave))); setEtapa(Math.min(...faltas.map((f) => f.etapa))); setMensagem(textoPendencias(faltas)); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    iniciar(async () => { const r = await finalizarFicha(token, dados, assinatura ?? ""); if (!r.ok) setMensagem(r.erro ?? "Não foi possível enviar."); else window.location.reload(); });
  }

  const secoes = secoesVisiveis(dados, tipo, etapa);
  const anexos = anexosDe(tipo, garantia, dados);
  const cheio = documentos.length >= LIMITE_ARQUIVOS;

  return <div className="space-y-5">
    <div className="overflow-x-auto"><div className="flex min-w-[640px] items-center">{ETAPAS.map((nome, i) => <div key={nome} className="flex flex-1 items-center last:flex-none"><div className="flex flex-col items-center gap-1"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < etapa ? "bg-emerald-600 text-white" : i === etapa ? "bg-[#731515] text-white" : "bg-stone-200 text-stone-500"}`}>{i < etapa ? <Check className="h-4 w-4" /> : i + 1}</div><span className={`whitespace-nowrap text-[11px] ${i === etapa ? "font-semibold text-[#731515]" : "text-stone-500"}`}>{nome}</span></div>{i < ultima && <div className={`mx-2 mb-5 h-px flex-1 ${i < etapa ? "bg-emerald-500" : "bg-stone-200"}`} />}</div>)}</div></div>
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      {etapa === 0 && tipo !== "titular" && <div className="mb-6 space-y-4">
        <div><h2 className="text-xl font-bold">Você foi indicado(a) como {ROTULO_TIPO[tipo].toLowerCase()}</h2><p className="mt-1 text-sm text-stone-500">{tipo === "fiador" ? "Como fiador, você garante o contrato de locação abaixo. Preencha a sua própria ficha, com os seus dados e documentos." : "Como corresponsável, você também assina o contrato de locação abaixo como locatário. Preencha a sua própria ficha, com os seus dados e documentos."}</p></div>
        {proposta && <dl className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm sm:grid-cols-3"><div><dt className="text-xs font-medium text-stone-500">Titular da locação</dt><dd className="mt-0.5 font-semibold text-stone-900">{proposta.titular || "—"}</dd></div><div><dt className="text-xs font-medium text-stone-500">Imóvel</dt><dd className="mt-0.5 font-semibold text-stone-900">{proposta.imovel || "—"}</dd></div><div><dt className="text-xs font-medium text-stone-500">Garantia</dt><dd className="mt-0.5 font-semibold text-stone-900">{proposta.garantia || "A definir"}</dd></div></dl>}
      </div>}

      {secoes.length > 0 && <div className="space-y-7">{secoes.map((s) => <div key={s.id} className="space-y-4"><div><h2 className="text-lg font-bold">{s.titulo}</h2>{s.descricao && <p className="mt-1 text-sm text-stone-500">{s.descricao}</p>}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{s.campos.map(campo)}</div></div>)}</div>}

      {etapa === 0 && <div className="mt-7 space-y-6">
        {tipo === "titular" && <div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Entenda as garantias</h3><div className="grid gap-3 sm:grid-cols-2">{GARANTIAS.map((g) => <details key={g.nome} open={garantia === g.nome} className={`rounded-xl border p-4 ${garantia === g.nome ? "border-[#b9822c] bg-amber-50/50" : "border-stone-200"}`}><summary className="cursor-pointer font-semibold text-stone-900">{g.nome}</summary><ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-5 text-stone-600">{g.itens.map((item) => <li key={item}>{item}</li>)}</ul>{"obs" in g && <p className="mt-3 rounded-lg bg-white/80 p-2 text-xs font-medium text-stone-600"><Info className="mr-1 inline h-3.5 w-3.5" />{g.obs}</p>}</details>)}</div></div>}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><h3 className="flex items-center gap-2 font-semibold"><FileUp className="h-4 w-4 shrink-0 text-[#b9822c]" /> Documentação necessária (cópias)</h3><ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-stone-600">{DOCUMENTACAO_NECESSARIA.filter((d) => tipo !== "fiador" || !d.includes("(apenas")).map((d) => <li key={d}>{d}</li>)}</ol><ul className="mt-3 space-y-1 text-xs leading-5 text-stone-500">{DOCUMENTACAO_POR_OCUPACAO.map(([quem, o]) => <li key={quem}><strong>{quem}:</strong> {o}.</li>)}</ul></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><ShieldCheck className="mr-1 inline h-4 w-4" />Todas as fichas de cadastro passam por análise minuciosa pelo setor de locação. Em caso de recusa, não é possível informar o motivo, pois a maioria das seguradoras não detalha a devolutiva em razão das diretrizes da LGPD.</div>
      </div>}

      {etapa === ETAPA_DOCUMENTOS && <div className="space-y-5"><div><h2 className="text-xl font-bold">Documentos</h2><p className="mt-1 text-sm text-stone-500">Envie todos os documentos aplicáveis. É possível selecionar vários arquivos, respeitando o limite total de {LIMITE_ARQUIVOS}.</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#731515] transition-all" style={{ width: `${Math.min(100, (documentos.length / LIMITE_ARQUIVOS) * 100)}%` }} /></div><p className="mt-1 text-right text-xs font-medium text-stone-500">{documentos.length} de {LIMITE_ARQUIVOS} arquivos</p></div><div className="grid gap-3 sm:grid-cols-2">{anexos.map((a) => <label key={a} className={`flex items-center gap-3 rounded-xl border border-dashed border-stone-300 p-4 ${cheio ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#731515]"}`}><FileUp className="h-5 w-5 shrink-0 text-[#b9822c]" /><span className="min-w-0 flex-1 text-sm font-medium">{a}</span><input type="file" multiple className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={enviandoArquivo || cheio} onChange={(e) => { void enviarArquivos(e.target.files, a); e.target.value = ""; }} /></label>)}</div>{enviandoArquivo && <p className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Enviando documento…</p>}{documentos.length > 0 && <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Arquivos enviados ({documentos.length}/{LIMITE_ARQUIVOS})</p><ul className="mt-2 space-y-1">{documentos.map((d) => <li key={d.id} className="break-words text-sm text-stone-700">✓ {d.nome_arquivo} <span className="text-xs text-stone-400">({d.tipo})</span></li>)}</ul></div>}<ul className="space-y-1 rounded-xl border border-stone-200 p-4 text-xs leading-5 text-stone-600">{DOCUMENTACAO_POR_OCUPACAO.map(([quem, o]) => <li key={quem}><strong>{quem}:</strong> {o}.</li>)}</ul></div>}

      {etapa === ETAPA_DECLARACAO && <div className="space-y-5"><div><h2 className="text-xl font-bold">Declaração, LGPD e assinatura</h2><p className="mt-1 text-sm text-stone-500">Leia as condições antes do envio definitivo.</p></div>
        <div className="max-h-[28rem] space-y-5 overflow-y-auto rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{DECLARACAO.map((b) => <div key={b.titulo} className="space-y-2"><h3 className="text-center text-xs font-bold uppercase tracking-wide text-stone-800">{b.titulo}</h3>{b.paragrafos.map((p, i) => <p key={i}>{p.destaque && <strong className="text-stone-800">{p.destaque} </strong>}{p.texto}</p>)}</div>)}</div>
        <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm"><input type="checkbox" className="mt-1 shrink-0 accent-[#731515]" checked={dados.consentimento_lgpd === true} onChange={(e) => atualizar("consentimento_lgpd", e.target.checked)} /><span>Li as cláusulas acima e autorizo o compartilhamento dos meus dados pessoais e documentação nos termos informados. {ACEITE}</span></label>
        <div><p className="mb-2 text-sm font-semibold">Assinatura do proponente *</p><CanvasAssinatura onChange={setAssinatura} /></div></div>}

      {mensagem && <p className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{mensagem}</p>}
      <div className="mt-7 flex items-center justify-between gap-3 border-t border-stone-200 pt-5"><button type="button" disabled={etapa === 0 || pendente} onClick={() => { setMensagem(""); setEtapa((e) => e - 1); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 disabled:invisible"><ChevronLeft className="h-4 w-4" /> Voltar</button>{etapa < ultima ? <button type="button" disabled={pendente || enviandoArquivo} onClick={() => salvarEIr(etapa + 1)} className="inline-flex items-center gap-2 rounded-lg bg-[#731515] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pendente && <Loader2 className="h-4 w-4 animate-spin" />} Salvar e continuar <ChevronRight className="h-4 w-4" /></button> : <button type="button" disabled={pendente} onClick={concluir} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pendente && <Loader2 className="h-4 w-4 animate-spin" />} Enviar ficha</button>}</div>
    </section><p className="text-center text-xs text-stone-500">O progresso é salvo ao avançar. Você pode fechar esta página e continuar usando o mesmo link.</p>
  </div>;
}
