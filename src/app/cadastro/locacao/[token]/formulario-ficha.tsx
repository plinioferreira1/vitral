"use client";

import { useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, FileUp, Loader2 } from "lucide-react";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
import { createClient } from "@/lib/supabase/client";
import { confirmarUpload, finalizarFicha, prepararUpload, salvarRascunho } from "./actions";

type Dados = Record<string, string | number | boolean | null>;
type Documento = { id: string; nome_arquivo: string; tipo: string };

const CAMPO = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-[#731515] focus:ring-2 focus:ring-[#731515]/10";
const ETAPAS = ["Proposta", "Dados pessoais", "Renda e patrimônio", "Documentos", "Declaração"];

function mascaraCpf(valor: string) { return valor.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
function mascaraTelefone(valor: string) { const d = valor.replace(/\D/g, "").slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3"); }
function mascaraCep(valor: string) { return valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }
function mascaraMoeda(valor: string) { const n = Number(valor.replace(/\D/g, "")) / 100; return n ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""; }

export function FormularioFicha({ token, iniciais, documentosIniciais }: { token: string; iniciais: Dados; documentosIniciais: Documento[] }) {
  const [etapa, setEtapa] = useState(0);
  const [dados, setDados] = useState<Dados>(iniciais);
  const [documentos, setDocumentos] = useState(documentosIniciais);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [pendente, iniciar] = useTransition();

  function atualizar(nome: string, valor: string | boolean) { setDados((atual) => ({ ...atual, [nome]: valor })); }
  function input(nome: string, rotulo: string, obrigatorio = false, tipo = "text", mascara?: (v: string) => string) {
    return <label className="block text-sm font-medium text-stone-700">{rotulo}{obrigatorio && <span className="text-[#731515]"> *</span>}<input className={CAMPO} type={tipo} required={obrigatorio} value={String(dados[nome] ?? "")} onChange={(e) => atualizar(nome, mascara ? mascara(e.target.value) : e.target.value)} /></label>;
  }
  function select(nome: string, rotulo: string, opcoes: string[], obrigatorio = false) {
    return <label className="block text-sm font-medium text-stone-700">{rotulo}{obrigatorio && <span className="text-[#731515]"> *</span>}<select className={CAMPO} required={obrigatorio} value={String(dados[nome] ?? "")} onChange={(e) => atualizar(nome, e.target.value)}><option value="">Selecione</option>{opcoes.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
  }
  function salvarEIr(proxima: number) {
    setMensagem("");
    iniciar(async () => { const r = await salvarRascunho(token, dados); if (!r.ok) setMensagem(r.erro ?? "Não foi possível salvar."); else { setEtapa(proxima); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  }
  async function enviarArquivo(file: File, tipo: string) {
    setMensagem(""); setEnviandoArquivo(true);
    try {
      const preparado = await prepararUpload(token, file.name, file.type, file.size);
      if (!preparado.ok || !preparado.caminho || !preparado.uploadToken) throw new Error(preparado.erro);
      const supabase = createClient();
      const { error } = await supabase.storage.from("fichas-locacao").uploadToSignedUrl(preparado.caminho, preparado.uploadToken, file, { contentType: file.type });
      if (error) throw error;
      const confirmado = await confirmarUpload(token, { caminho: preparado.caminho, nome: file.name, mime: file.type, tamanho: file.size, tipo });
      if (!confirmado.ok) throw new Error(confirmado.erro);
      setDocumentos((atuais) => [...atuais, { id: preparado.caminho!, nome_arquivo: file.name, tipo }]);
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível enviar o arquivo."); }
    finally { setEnviandoArquivo(false); }
  }
  function concluir() {
    setMensagem("");
    iniciar(async () => { const r = await finalizarFicha(token, dados, assinatura ?? ""); if (!r.ok) setMensagem(r.erro ?? "Não foi possível enviar."); else window.location.reload(); });
  }

  return <div className="space-y-5">
    <div className="overflow-x-auto"><div className="flex min-w-[560px] items-center">{ETAPAS.map((nome, i) => <div key={nome} className="flex flex-1 items-center last:flex-none"><div className="flex flex-col items-center gap-1"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < etapa ? "bg-emerald-600 text-white" : i === etapa ? "bg-[#731515] text-white" : "bg-stone-200 text-stone-500"}`}>{i < etapa ? <Check className="h-4 w-4" /> : i + 1}</div><span className={`whitespace-nowrap text-[11px] ${i === etapa ? "font-semibold text-[#731515]" : "text-stone-500"}`}>{nome}</span></div>{i < ETAPAS.length - 1 && <div className={`mx-2 mb-5 h-px flex-1 ${i < etapa ? "bg-emerald-500" : "bg-stone-200"}`} />}</div>)}</div></div>

    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      {etapa === 0 && <div className="space-y-5"><div><h2 className="text-xl font-bold text-stone-900">Informações da locação</h2><p className="mt-1 text-sm text-stone-500">Confirme o imóvel e conte como pretende utilizá-lo.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2">{input("imovel_interesse", "Imóvel de interesse", true)}</div>{select("finalidade", "Finalidade", ["Residencial", "Comercial"], true)}{select("garantia", "Modalidade de garantia", ["Seguro Fiança", "Título de Capitalização", "Garantia Investe", "A definir"], true)}{input("moradores", "Quantas pessoas ocuparão o imóvel?")}{select("possui_pet", "Possui animais?", ["Não", "Sim — pequeno porte", "Sim — médio/grande porte"])}<div className="sm:col-span-2">{input("data_pretendida", "Data pretendida para início", false, "date")}</div></div></div>}

      {etapa === 1 && <div className="space-y-5"><div><h2 className="text-xl font-bold">Dados pessoais</h2><p className="mt-1 text-sm text-stone-500">Preencha exatamente como consta nos documentos.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2">{input("nome_completo", "Nome completo", true)}</div>{input("cpf", "CPF", true, "text", mascaraCpf)}{input("rg", "RG / órgão expedidor", true)}{input("nascimento", "Data de nascimento", true, "date")}{select("estado_civil", "Estado civil", ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"], true)}{input("telefone", "Telefone", true, "tel", mascaraTelefone)}{input("email", "E-mail", true, "email")}<div className="sm:col-span-2">{input("endereco", "Endereço residencial atual", true)}</div>{input("cidade", "Cidade / UF", true)}{input("cep", "CEP", true, "text", mascaraCep)}</div></div>}

      {etapa === 2 && <div className="space-y-5"><div><h2 className="text-xl font-bold">Renda e patrimônio</h2><p className="mt-1 text-sm text-stone-500">Essas informações serão usadas exclusivamente na análise cadastral.</p></div><div className="grid gap-4 sm:grid-cols-2">{input("profissao", "Profissão", true)}{input("empresa", "Empresa / empregador", true)}{input("renda_mensal", "Renda mensal", true, "text", mascaraMoeda)}{input("tempo_empresa", "Tempo na empresa / atividade")}{select("imovel_proprio", "Possui imóvel?", ["Não", "Sim — quitado", "Sim — financiado"])}{input("veiculo", "Veículo (modelo/ano)")}{input("banco", "Banco principal")}{input("agencia", "Agência")}{input("conta", "Conta")}{input("referencia_nome", "Referência pessoal")}{input("referencia_telefone", "Telefone da referência", false, "tel", mascaraTelefone)}<label className="block text-sm font-medium text-stone-700 sm:col-span-2">Observações<textarea className={`${CAMPO} min-h-24`} value={String(dados.observacoes ?? "")} onChange={(e) => atualizar("observacoes", e.target.value)} /></label></div></div>}

      {etapa === 3 && <div className="space-y-5"><div><h2 className="text-xl font-bold">Documentos</h2><p className="mt-1 text-sm text-stone-500">Aceitamos PDF, JPG, PNG ou WebP, com até 10 MB por arquivo.</p></div><div className="grid gap-3 sm:grid-cols-2">{["Documento de identidade", "Comprovante de renda", "Comprovante de residência", "Outros documentos"].map((tipo) => <label key={tipo} className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 p-4 hover:border-[#731515]"><FileUp className="h-5 w-5 text-[#b9822c]" /><span className="flex-1 text-sm font-medium">{tipo}</span><input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={enviandoArquivo} onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarArquivo(f, tipo); e.target.value = ""; }} /></label>)}</div>{enviandoArquivo && <p className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Enviando documento…</p>}{documentos.length > 0 && <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Arquivos enviados</p><ul className="mt-2 space-y-1">{documentos.map((d) => <li key={d.id} className="text-sm text-stone-700">✓ {d.nome_arquivo} <span className="text-xs text-stone-400">({d.tipo})</span></li>)}</ul></div>}</div>}

      {etapa === 4 && <div className="space-y-5"><div><h2 className="text-xl font-bold">Declaração e assinatura</h2><p className="mt-1 text-sm text-stone-500">Revise as informações antes do envio definitivo.</p></div><div className="rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600"><p>Declaro que as informações prestadas são verdadeiras e autorizo a SACRA a utilizá-las para análise cadastral e da proposta de locação.</p><p className="mt-2">Estou ciente de que o envio desta ficha não representa aprovação automática da locação.</p></div><label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm"><input type="checkbox" className="mt-1 accent-[#731515]" checked={dados.consentimento_lgpd === true} onChange={(e) => atualizar("consentimento_lgpd", e.target.checked)} /><span>Autorizo o tratamento dos meus dados pessoais e documentos para análise e formalização da locação, nos termos da LGPD.</span></label><div><p className="mb-2 text-sm font-semibold">Assinatura do proponente *</p><CanvasAssinatura onChange={setAssinatura} /></div></div>}

      {mensagem && <p className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{mensagem}</p>}
      <div className="mt-7 flex items-center justify-between border-t border-stone-200 pt-5"><button type="button" disabled={etapa === 0 || pendente} onClick={() => setEtapa((e) => e - 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 disabled:invisible"><ChevronLeft className="h-4 w-4" /> Voltar</button>{etapa < ETAPAS.length - 1 ? <button type="button" disabled={pendente || enviandoArquivo} onClick={() => salvarEIr(etapa + 1)} className="inline-flex items-center gap-2 rounded-lg bg-[#731515] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pendente && <Loader2 className="h-4 w-4 animate-spin" />} Salvar e continuar <ChevronRight className="h-4 w-4" /></button> : <button type="button" disabled={pendente} onClick={concluir} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pendente && <Loader2 className="h-4 w-4 animate-spin" />} Enviar ficha</button>}</div>
    </section>
    <p className="text-center text-xs text-stone-500">O progresso é salvo ao avançar. Você pode fechar esta página e continuar usando o mesmo link.</p>
  </div>;
}
