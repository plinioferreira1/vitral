"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Loader2, Paperclip, Plus, Save, Trash2, X } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { formatarCpfCnpj } from "@/lib/mascaras";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIAS,
  MARCOS,
  PAGADORES,
  ROTULO_CATEGORIA,
  ROTULO_MARCO,
  ROTULO_PAGADOR,
  ROTULO_RESPONSAVEL,
  ROTULO_TIPO_CALCULO,
  TIPOS_CALCULO,
  dataBR,
  fraseAcerto,
  periodoDoAno,
  periodoDoMes,
  type Categoria,
  type EncargoCalculado,
  type EncargoEntrada,
  type Marco,
  type Pagador,
  type Responsavel,
  type TipoCalculo,
} from "@/lib/termo-entrega/calculo";
import {
  ROTULO_SERVICO,
  ROTULO_TIPO_CONTA,
  ROTULO_TIPO_PIX,
  STATUS_AGUA_GAS,
  STATUS_ENERGIA,
  TIPOS_CONTA,
  TIPOS_PIX,
  VARIAVEIS_CLAUSULA,
  calcularDocumento,
  compradores,
  marcoEfetivo,
  pendenciasParaGerar,
  renderizarClausula,
  textoRessarcimento,
  vendedores,
  type DocumentoTermo,
  type PapelParte,
  type ParteTermo,
  type Servico,
} from "@/lib/termo-entrega/conteudo";
import { formatarCentavos, valorPorExtenso } from "@/lib/termo-entrega/extenso";
import { registrarAnexo, removerAnexo, salvarTermo } from "../actions";

const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";
const BOTAO_MINI = "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-background hover:text-ink";

export type AnexoTela = { id: string; encargoId: string | null; nome: string };

/** Campo de dinheiro em centavos inteiros: digita 33880 e vê 338,80. */
function CampoCentavos({ valor, aoMudar, id, desabilitado }: { valor: number; aoMudar: (centavos: number) => void; id?: string; desabilitado?: boolean }) {
  const texto = valor
    ? `${Math.floor(valor / 100)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${String(valor % 100).padStart(2, "0")}`
    : "";
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">R$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={desabilitado}
        value={texto}
        placeholder="0,00"
        onChange={(e) => aoMudar(Math.min(99_999_999_999, Number(e.target.value.replace(/\D/g, "").slice(0, 12)) || 0))}
        className={`${INPUT_CLASS} num pl-9 text-right disabled:opacity-60`}
      />
    </div>
  );
}

function Secao({ id, numero, titulo, descricao, children }: { id: string; numero: number; titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`${CARD_CLASS} scroll-mt-24 p-4 sm:p-6`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{numero}</span>
        <div>
          <h2 className="text-base font-semibold text-ink">{titulo}</h2>
          {descricao && <p className="text-xs text-ink-muted">{descricao}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function novoEncargo(categoria: Categoria, marco: string | null): EncargoEntrada {
  const base: EncargoEntrada = {
    id: crypto.randomUUID(),
    categoria,
    descricao: ROTULO_CATEGORIA[categoria],
    competencia: "",
    periodoInicio: null,
    periodoFim: null,
    vencimento: null,
    valorTotalCentavos: 0,
    pagoPor: "vendedor",
    responsavel: "proporcional",
    tipoCalculo: "proporcional_dias",
    manualVendedorCentavos: 0,
    manualCompradorCentavos: 0,
    observacao: "",
  };
  const ano = marco ? Number(marco.slice(0, 4)) : null;
  const mes = marco ? Number(marco.slice(5, 7)) : null;
  if (categoria === "iptu_tlp") {
    if (ano) {
      const p = periodoDoAno(ano);
      return { ...base, descricao: `IPTU/TLP ${ano}`, competencia: String(ano), periodoInicio: p.inicio, periodoFim: p.fim };
    }
    return base;
  }
  if (["multa_condominial", "multa_contratual", "juros", "debito_anterior"].includes(categoria)) return { ...base, tipoCalculo: "integral", responsavel: "vendedor", pagoPor: "nao_pago" };
  if (categoria === "credito" || categoria === "outro") return { ...base, tipoCalculo: "integral", responsavel: "vendedor", pagoPor: "comprador" };
  if (ano && mes) {
    const p = periodoDoMes(ano, mes);
    return { ...base, competencia: `${String(mes).padStart(2, "0")}/${ano}`, periodoInicio: p.inicio, periodoFim: p.fim };
  }
  return base;
}

function ResultadoEncargo({ c, e }: { c: EncargoCalculado; e: EncargoEntrada }) {
  if (!c.valido) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{c.erros.join(" ")}</p>;
  }
  return (
    <div className="space-y-2 rounded-lg bg-background px-3 py-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-ink-muted">Vendedor{c.diasVendedor !== null ? ` · ${c.diasVendedor} dia${c.diasVendedor === 1 ? "" : "s"}` : ""}</p>
          <p className="num text-sm font-semibold text-ink">{formatarCentavos(c.parteVendedorCentavos)}</p>
          {c.periodoVendedor && <p className="text-[11px] text-ink-muted">{dataBR(c.periodoVendedor.inicio)} a {dataBR(c.periodoVendedor.fim)}</p>}
        </div>
        <div>
          <p className="text-ink-muted">Comprador{c.diasComprador !== null ? ` · ${c.diasComprador} dia${c.diasComprador === 1 ? "" : "s"}` : ""}</p>
          <p className="num text-sm font-semibold text-ink">{formatarCentavos(c.parteCompradorCentavos)}</p>
          {c.periodoComprador && <p className="text-[11px] text-ink-muted">{dataBR(c.periodoComprador.inicio)} a {dataBR(c.periodoComprador.fim)}</p>}
        </div>
      </div>
      <p className="text-[11px] text-ink-muted">{c.memoria}</p>
      {c.avisos.map((a) => (
        <p key={a} className="text-[11px] text-amber-800">{a}</p>
      ))}
      <p className={`font-semibold ${c.ressarcimentoDe ? "text-brand" : "text-ink-muted"}`}>
        {c.ressarcimentoDe === "comprador"
          ? `Comprador ressarce o vendedor em ${formatarCentavos(c.ressarcimentoCentavos)}`
          : c.ressarcimentoDe === "vendedor"
            ? `Vendedor ressarce o comprador em ${formatarCentavos(c.ressarcimentoCentavos)}`
            : e.pagoPor === "nao_pago" || e.pagoPor === "outro"
              ? "Sem ressarcimento entre as partes: cada uma quita a sua parte."
              : "Sem ressarcimento: quem pagou é o próprio responsável."}
      </p>
    </div>
  );
}

export function EditorTermo({ termoId, tenantId, codigo, versao, inicial, anexosIniciais }: { termoId: string; tenantId: string; codigo: string; versao: number; inicial: DocumentoTermo; anexosIniciais: AnexoTela[] }) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentoTermo>(inicial);
  const [sujo, setSujo] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [anexos, setAnexos] = useState<AnexoTela[]>(anexosIniciais);
  const [enviandoAnexo, setEnviandoAnexo] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const { calculos, acerto } = useMemo(() => calcularDocumento(doc), [doc]);
  const pendencias = useMemo(() => pendenciasParaGerar(doc), [doc]);
  const marco = marcoEfetivo(doc);
  const nV = vendedores(doc).length;
  const nC = compradores(doc).length;

  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  const mudar = (fn: (d: DocumentoTermo) => DocumentoTermo) => {
    setDoc((d) => fn(d));
    setSujo(true);
    setMensagem(null);
  };
  const mudarParte = (id: string, campos: Partial<ParteTermo>) => mudar((d) => ({ ...d, partes: d.partes.map((p) => (p.id === id ? { ...p, ...campos } : p)) }));
  const mudarEncargo = (id: string, campos: Partial<EncargoEntrada>) => mudar((d) => ({ ...d, encargos: d.encargos.map((e) => (e.id === id ? { ...e, ...campos } : e)) }));
  const mudarServico = (chave: "energia" | "agua" | "gas", campos: Partial<Servico>) => mudar((d) => ({ ...d, demais: { ...d.demais, [chave]: { ...d.demais[chave], ...campos } } }));

  function salvar(depois?: "previa") {
    iniciar(async () => {
      const r = await salvarTermo(termoId, doc);
      if (!r.ok) {
        setMensagem({ tipo: "erro", texto: r.erro ?? "Não foi possível salvar." });
        return;
      }
      setSujo(false);
      setMensagem({ tipo: "ok", texto: "Rascunho salvo." });
      if (depois === "previa") router.push(`/vendas/termos-entrega/${termoId}?previa=1`);
      else router.refresh();
    });
  }

  async function anexar(encargoId: string, arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.size > 10 * 1024 * 1024) return setMensagem({ tipo: "erro", texto: "Arquivo maior que 10 MB." });
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) return setMensagem({ tipo: "erro", texto: "Envie PDF ou imagem (JPG, PNG)." });
    setEnviandoAnexo(encargoId);
    const extensao = arquivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
    const caminho = `${tenantId}/${termoId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await createClient().storage.from("termos-entrega").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
    if (error) {
      setEnviandoAnexo(null);
      return setMensagem({ tipo: "erro", texto: `Não foi possível enviar o anexo: ${error.message}` });
    }
    const r = await registrarAnexo(termoId, encargoId, caminho, arquivo.name, arquivo.size);
    setEnviandoAnexo(null);
    if (!r.ok || !r.id) return setMensagem({ tipo: "erro", texto: r.erro ?? "Não foi possível registrar o anexo." });
    setAnexos((a) => [...a, { id: r.id!, encargoId, nome: arquivo.name }]);
  }

  async function tirarAnexo(id: string) {
    const r = await removerAnexo(id);
    if (!r.ok) return setMensagem({ tipo: "erro", texto: r.erro ?? "Não foi possível remover o anexo." });
    setAnexos((a) => a.filter((x) => x.id !== id));
  }

  function blocoPartes(papel: PapelParte, titulo: string) {
    const lista = doc.partes.filter((p) => p.papel === papel);
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
          <button type="button" className={BOTAO_MINI} onClick={() => mudar((d) => ({ ...d, partes: [...d.partes, { id: crypto.randomUUID(), papel, nome: "", cpfCnpj: "", rg: "", email: "", clienteId: null }] }))}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {lista.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-ink-muted">Nenhum {papel} informado.</p>}
        <div className="space-y-3">
          {lista.map((p) => (
            <div key={p.id} className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr_auto]">
              <label className="block sm:col-span-2 lg:col-span-1">
                <span className={ROTULO}>Nome completo</span>
                <input value={p.nome} onChange={(e) => mudarParte(p.id, { nome: e.target.value })} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={ROTULO}>CPF/CNPJ</span>
                <input value={p.cpfCnpj} inputMode="numeric" onChange={(e) => mudarParte(p.id, { cpfCnpj: formatarCpfCnpj(e.target.value) })} className={`${INPUT_CLASS} num`} />
              </label>
              <label className="block">
                <span className={ROTULO}>RG</span>
                <input value={p.rg} onChange={(e) => mudarParte(p.id, { rg: e.target.value })} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={ROTULO}>E-mail</span>
                <input type="email" value={p.email} onChange={(e) => mudarParte(p.id, { email: e.target.value })} className={INPUT_CLASS} />
              </label>
              <button
                type="button"
                aria-label={`Remover ${p.nome || papel}`}
                className="self-end rounded-lg p-2.5 text-ink-muted hover:bg-rose-50 hover:text-rose-700"
                onClick={() => mudar((d) => ({ ...d, partes: d.partes.filter((x) => x.id !== p.id), ressarcimento: d.ressarcimento.beneficiario === p.id ? { ...d.ressarcimento, beneficiario: "" } : d.ressarcimento }))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function blocoServico(chave: "energia" | "agua" | "gas", titulo: string, opcoes: readonly string[]) {
    const s = doc.demais[chave];
    return (
      <div className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-[110px_1fr_1.4fr] sm:items-end">
        <p className="text-sm font-semibold text-ink sm:pb-2.5">{titulo}</p>
        <label className="block">
          <span className={ROTULO}>Situação</span>
          <select value={s.status} onChange={(e) => mudarServico(chave, { status: e.target.value })} className={INPUT_CLASS}>
            <option value="">Não informado</option>
            {opcoes.filter(Boolean).map((o) => (
              <option key={o} value={o}>
                {ROTULO_SERVICO[o]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={ROTULO}>Observação</span>
          <input value={s.observacao} onChange={(e) => mudarServico(chave, { observacao: e.target.value })} className={INPUT_CLASS} />
        </label>
      </div>
    );
  }

  const resumo = (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Acerto final</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-ink-muted">Comprador deve ao vendedor</p>
          <p className="num text-base font-semibold text-ink">{formatarCentavos(acerto.compradorDeveCentavos)}</p>
        </div>
        <div>
          <p className="text-ink-muted">Vendedor deve ao comprador</p>
          <p className="num text-base font-semibold text-ink">{formatarCentavos(acerto.vendedorDeveCentavos)}</p>
        </div>
      </div>
      <div className={`rounded-xl px-4 py-3 ${acerto.devedor ? "bg-brand text-white" : "bg-emerald-50 text-emerald-800"}`}>
        <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">Saldo final</p>
        <p className="num text-2xl font-bold">{formatarCentavos(acerto.saldoCentavos)}</p>
        <p className="text-xs font-semibold">{acerto.aFavorDe ? `A favor de: ${acerto.aFavorDe === "vendedor" ? (nV > 1 ? "vendedores" : "vendedor") : nC > 1 ? "compradores" : "comprador"}` : "Não há valores a ressarcir"}</p>
      </div>
      <p className="text-xs font-semibold text-ink">{fraseAcerto(acerto, { vendedores: Math.max(1, nV), compradores: Math.max(1, nC) })}</p>
      {acerto.saldoCentavos > 0 && <p className="text-[11px] text-ink-muted">{valorPorExtenso(acerto.saldoCentavos)}</p>}
      {acerto.emAbertoVendedorCentavos + acerto.emAbertoCompradorCentavos > 0 && (
        <p className="text-[11px] text-ink-muted">
          Em aberto com terceiros (fora do acerto): vendedor {formatarCentavos(acerto.emAbertoVendedorCentavos)} · comprador {formatarCentavos(acerto.emAbertoCompradorCentavos)}
        </p>
      )}
    </div>
  );

  const botoes = (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={salvando} onClick={() => salvar()} className={`${SECONDARY_BUTTON_CLASS} flex-1 disabled:opacity-60`}>
        {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar rascunho
      </button>
      <button type="button" disabled={salvando} onClick={() => salvar("previa")} className={`${PRIMARY_BUTTON_CLASS} flex-1 disabled:opacity-60`}>
        <Eye size={15} /> Pré-visualizar
      </button>
    </div>
  );

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-0">
      <div className="min-w-0 space-y-5">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 text-xs">
          {[
            ["negocio", "1. Dados do negócio"],
            ["encargos", "2. Proporcionalidade"],
            ["demais", "3. Demais encargos"],
            ["acerto", "4. Acerto financeiro"],
            ["clausulas", "5. Cláusulas"],
          ].map(([id, rotulo]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 font-medium text-ink-muted hover:border-brand/40 hover:text-brand">
              {rotulo}
            </a>
          ))}
        </nav>

        {/* 1 */}
        <Secao id="negocio" numero={1} titulo="Dados do negócio" descricao="Confira o que veio da venda. O que for alterado aqui vale só para este termo.">
          <div className="space-y-5">
            {blocoPartes("vendedor", "Vendedor(es)")}
            {blocoPartes("comprador", "Comprador(es)")}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Imóvel objeto do contrato</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block sm:col-span-2 lg:col-span-4">
                  <span className={ROTULO}>Endereço completo</span>
                  <textarea rows={2} value={doc.imovel.endereco} onChange={(e) => mudar((d) => ({ ...d, imovel: { ...d.imovel, endereco: e.target.value } }))} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Área privativa</span>
                  <input value={doc.imovel.areaPrivativa} placeholder="Ex.: 56,30 m²" onChange={(e) => mudar((d) => ({ ...d, imovel: { ...d.imovel, areaPrivativa: e.target.value } }))} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Inscrição de IPTU</span>
                  <input value={doc.imovel.inscricaoIptu} onChange={(e) => mudar((d) => ({ ...d, imovel: { ...d.imovel, inscricaoIptu: e.target.value } }))} className={`${INPUT_CLASS} num`} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Matrícula</span>
                  <input value={doc.imovel.matricula} onChange={(e) => mudar((d) => ({ ...d, imovel: { ...d.imovel, matricula: e.target.value } }))} className={`${INPUT_CLASS} num`} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Cartório</span>
                  <input value={doc.imovel.cartorio} placeholder="Ex.: 3º Ofício de Registro de Imóveis do DF" onChange={(e) => mudar((d) => ({ ...d, imovel: { ...d.imovel, cartorio: e.target.value } }))} className={INPUT_CLASS} />
                </label>
                <label className="block sm:col-span-2 lg:col-span-4">
                  <span className={ROTULO}>Outros dados do imóvel (opcional)</span>
                  <input value={doc.imovel.outros} placeholder="Vaga de garagem, depósito…" onChange={(e) => mudar((d) => ({ ...d, imovel: { ...d.imovel, outros: e.target.value } }))} className={INPUT_CLASS} />
                </label>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Entrega das chaves e marco da proporcionalidade</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className={ROTULO}>Data da entrega das chaves</span>
                  <input type="date" value={doc.dataEntrega ?? ""} onChange={(e) => mudar((d) => ({ ...d, dataEntrega: e.target.value || null }))} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Hora (opcional)</span>
                  <input type="time" value={doc.horaEntrega} onChange={(e) => mudar((d) => ({ ...d, horaEntrega: e.target.value }))} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Marco da proporcionalidade</span>
                  <select value={doc.marco} onChange={(e) => mudar((d) => ({ ...d, marco: e.target.value as Marco }))} className={INPUT_CLASS}>
                    {MARCOS.map((m) => (
                      <option key={m} value={m}>
                        {ROTULO_MARCO[m]}
                      </option>
                    ))}
                  </select>
                </label>
                {doc.marco !== "entrega" && (
                  <label className="block">
                    <span className={ROTULO}>{ROTULO_MARCO[doc.marco]}</span>
                    <input type="date" value={doc.marcoData ?? ""} onChange={(e) => mudar((d) => ({ ...d, marcoData: e.target.value || null }))} className={INPUT_CLASS} />
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {marco ? `A partir de ${dataBR(marco)} (inclusive) os encargos proporcionais são do comprador; até a véspera, do vendedor.` : "Informe a data para o sistema calcular os proporcionais."}
              </p>
            </div>
          </div>
        </Secao>

        {/* 2 */}
        <Secao id="encargos" numero={2} titulo="Proporcionalidade e encargos" descricao="O sistema calcula os dias e os valores; você só informa o valor, o período e quem pagou.">
          <div className="space-y-4">
            {doc.encargos.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">Nenhum encargo ainda. Comece pelo condomínio e pelo IPTU/TLP.</p>}
            {doc.encargos.map((e, indice) => {
              const c = calculos[e.id];
              const doEncargo = anexos.filter((a) => a.encargoId === e.id);
              return (
                <div key={e.id} className="rounded-xl border border-border/80 p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {indice + 1}. {e.descricao || ROTULO_CATEGORIA[e.categoria]}
                    </p>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Subir" disabled={indice === 0} className="rounded-md p-1.5 text-ink-muted hover:bg-background disabled:opacity-30" onClick={() => mudar((d) => { const l = [...d.encargos]; [l[indice - 1], l[indice]] = [l[indice], l[indice - 1]]; return { ...d, encargos: l }; })}>
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" aria-label="Descer" disabled={indice === doc.encargos.length - 1} className="rounded-md p-1.5 text-ink-muted hover:bg-background disabled:opacity-30" onClick={() => mudar((d) => { const l = [...d.encargos]; [l[indice + 1], l[indice]] = [l[indice], l[indice + 1]]; return { ...d, encargos: l }; })}>
                        <ArrowDown size={15} />
                      </button>
                      <button type="button" aria-label="Remover encargo" className="rounded-md p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-700" onClick={() => { if (window.confirm(`Remover o encargo "${e.descricao}"?`)) mudar((d) => ({ ...d, encargos: d.encargos.filter((x) => x.id !== e.id) })); }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className={ROTULO}>Categoria</span>
                      <select value={e.categoria} onChange={(ev) => { const cat = ev.target.value as Categoria; mudarEncargo(e.id, { categoria: cat, descricao: e.descricao === ROTULO_CATEGORIA[e.categoria] || !e.descricao ? ROTULO_CATEGORIA[cat] : e.descricao }); }} className={INPUT_CLASS}>
                        {CATEGORIAS.map((cat) => (
                          <option key={cat} value={cat}>
                            {ROTULO_CATEGORIA[cat]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={ROTULO}>Descrição</span>
                      <input value={e.descricao} onChange={(ev) => mudarEncargo(e.id, { descricao: ev.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="block">
                      <span className={ROTULO}>Competência</span>
                      <input value={e.competencia} placeholder="10/2026 ou 2026" onChange={(ev) => mudarEncargo(e.id, { competencia: ev.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="block">
                      <span className={ROTULO}>Valor total</span>
                      <CampoCentavos valor={e.valorTotalCentavos} aoMudar={(v) => mudarEncargo(e.id, { valorTotalCentavos: v })} />
                    </label>

                    <label className="block">
                      <span className={ROTULO}>Quem efetuou o pagamento?</span>
                      <select value={e.pagoPor} onChange={(ev) => mudarEncargo(e.id, { pagoPor: ev.target.value as Pagador })} className={INPUT_CLASS}>
                        {PAGADORES.map((p) => (
                          <option key={p} value={p}>
                            {ROTULO_PAGADOR[p]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={ROTULO}>Tipo de cálculo</span>
                      <select
                        value={e.tipoCalculo}
                        onChange={(ev) => {
                          const tipo = ev.target.value as TipoCalculo;
                          mudarEncargo(e.id, { tipoCalculo: tipo, responsavel: tipo === "integral" ? (e.responsavel === "proporcional" ? "vendedor" : e.responsavel) : "proporcional" });
                        }}
                        className={INPUT_CLASS}
                      >
                        {TIPOS_CALCULO.map((t) => (
                          <option key={t} value={t}>
                            {ROTULO_TIPO_CALCULO[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={ROTULO}>Quem é responsável pelo valor?</span>
                      <select value={e.responsavel} disabled={e.tipoCalculo !== "integral"} onChange={(ev) => mudarEncargo(e.id, { responsavel: ev.target.value as Responsavel })} className={`${INPUT_CLASS} disabled:opacity-60`}>
                        {(e.tipoCalculo === "integral" ? (["vendedor", "comprador", "ambos"] as const) : (["proporcional"] as const)).map((r) => (
                          <option key={r} value={r}>
                            {ROTULO_RESPONSAVEL[r]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={ROTULO}>Data de vencimento</span>
                      <input type="date" value={e.vencimento ?? ""} onChange={(ev) => mudarEncargo(e.id, { vencimento: ev.target.value || null })} className={INPUT_CLASS} />
                    </label>

                    {e.tipoCalculo === "proporcional_dias" && (
                      <>
                        <label className="block">
                          <span className={ROTULO}>Período inicial</span>
                          <input type="date" value={e.periodoInicio ?? ""} onChange={(ev) => mudarEncargo(e.id, { periodoInicio: ev.target.value || null })} className={INPUT_CLASS} />
                        </label>
                        <label className="block">
                          <span className={ROTULO}>Período final</span>
                          <input type="date" value={e.periodoFim ?? ""} onChange={(ev) => mudarEncargo(e.id, { periodoFim: ev.target.value || null })} className={INPUT_CLASS} />
                        </label>
                        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                          <button type="button" className={BOTAO_MINI} disabled={!marco} onClick={() => { if (!marco) return; const p = periodoDoMes(Number(marco.slice(0, 4)), Number(marco.slice(5, 7))); mudarEncargo(e.id, { periodoInicio: p.inicio, periodoFim: p.fim, competencia: e.competencia || `${marco.slice(5, 7)}/${marco.slice(0, 4)}` }); }}>
                            Mês do marco
                          </button>
                          <button type="button" className={BOTAO_MINI} disabled={!marco} onClick={() => { if (!marco) return; const p = periodoDoAno(Number(marco.slice(0, 4))); mudarEncargo(e.id, { periodoInicio: p.inicio, periodoFim: p.fim, competencia: e.competencia || marco.slice(0, 4) }); }}>
                            Ano inteiro
                          </button>
                          <span className="pb-1.5 text-[11px] text-ink-muted">Valor anual, mensal ou de parcela: informe o período que o valor cobre.</span>
                        </div>
                      </>
                    )}
                    {e.tipoCalculo === "manual" && (
                      <>
                        <label className="block">
                          <span className={ROTULO}>Parte do vendedor</span>
                          <CampoCentavos valor={e.manualVendedorCentavos} aoMudar={(v) => mudarEncargo(e.id, { manualVendedorCentavos: v })} />
                        </label>
                        <label className="block">
                          <span className={ROTULO}>Parte do comprador</span>
                          <CampoCentavos valor={e.manualCompradorCentavos} aoMudar={(v) => mudarEncargo(e.id, { manualCompradorCentavos: v })} />
                        </label>
                      </>
                    )}
                    <label className="block sm:col-span-2 lg:col-span-4">
                      <span className={ROTULO}>Observação (aparece no documento)</span>
                      <input value={e.observacao} onChange={(ev) => mudarEncargo(e.id, { observacao: ev.target.value })} className={INPUT_CLASS} />
                    </label>
                  </div>

                  <div className="mt-3">
                    <ResultadoEncargo c={c} e={e} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {doEncargo.map((a) => (
                      <span key={a.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background py-1 pl-2.5 pr-1 text-xs text-ink">
                        <Paperclip size={12} className="shrink-0 text-ink-muted" />
                        <a href={`/vendas/termos-entrega/${termoId}/anexo/${a.id}`} target="_blank" rel="noreferrer" className="truncate hover:underline">
                          {a.nome}
                        </a>
                        <button type="button" aria-label={`Remover anexo ${a.nome}`} className="rounded-full p-0.5 text-ink-muted hover:bg-rose-50 hover:text-rose-700" onClick={() => tirarAnexo(a.id)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <label className={`${BOTAO_MINI} cursor-pointer border-dashed ${enviandoAnexo === e.id ? "pointer-events-none opacity-60" : ""}`}>
                      {enviandoAnexo === e.id ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                      {enviandoAnexo === e.id ? "Enviando…" : "Anexar comprovante"}
                      <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(ev) => { void anexar(e.id, ev.target.files?.[0]); ev.target.value = ""; }} />
                    </label>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => mudar((d) => ({ ...d, encargos: [...d.encargos, novoEncargo("condominio", marcoEfetivo(d))] }))}>
                <Plus size={15} /> Condomínio
              </button>
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => mudar((d) => ({ ...d, encargos: [...d.encargos, novoEncargo("iptu_tlp", marcoEfetivo(d))] }))}>
                <Plus size={15} /> IPTU/TLP
              </button>
              <select
                value=""
                aria-label="Adicionar encargo"
                onChange={(ev) => {
                  const cat = ev.target.value as Categoria;
                  if (cat) mudar((d) => ({ ...d, encargos: [...d.encargos, novoEncargo(cat, marcoEfetivo(d))] }));
                }}
                className={`${INPUT_CLASS} w-auto`}
              >
                <option value="">+ Adicionar encargo…</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {ROTULO_CATEGORIA[cat]}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-ink-muted">
              Multas, juros, descontos, créditos e acordos: use “Valor integral” (de uma parte ou meio a meio) ou “Valor manual”. Em “Quem efetuou o pagamento”, indique quem pagou — ou quem vai receber o crédito.
            </p>
          </div>
        </Secao>

        {/* 3 */}
        <Secao id="demais" numero={3} titulo="Demais encargos e titularidades">
          <div className="space-y-3">
            {blocoServico("energia", "Energia", STATUS_ENERGIA)}
            {blocoServico("agua", "Água", STATUS_AGUA_GAS)}
            {blocoServico("gas", "Gás", STATUS_AGUA_GAS)}
          </div>
        </Secao>

        {/* 4 */}
        <Secao id="acerto" numero={4} titulo="Acerto financeiro" descricao="Compensação automática de tudo o que uma parte deve à outra.">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_1fr]">
            <div className="rounded-xl border border-border/70 p-4 lg:hidden">{resumo}</div>
            <div className="lg:col-span-2">
              <h3 className="mb-2 text-sm font-semibold text-ink">Dados para ressarcimento</h3>
              {!acerto.devedor && <p className="mb-3 text-xs text-ink-muted">Sem saldo a ressarcir no momento — estes dados só entram no documento quando houver saldo.</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block sm:col-span-2">
                  <span className={ROTULO}>Beneficiário do ressarcimento</span>
                  <select value={doc.ressarcimento.beneficiario} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, beneficiario: e.target.value } }))} className={INPUT_CLASS}>
                    <option value="">Selecione…</option>
                    {doc.partes
                      .filter((p) => p.nome)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.papel})
                        </option>
                      ))}
                    <option value="outro">Outro beneficiário autorizado</option>
                  </select>
                </label>
                {doc.ressarcimento.beneficiario === "outro" && (
                  <>
                    <label className="block">
                      <span className={ROTULO}>Nome</span>
                      <input value={doc.ressarcimento.nome} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, nome: e.target.value } }))} className={INPUT_CLASS} />
                    </label>
                    <label className="block">
                      <span className={ROTULO}>CPF/CNPJ</span>
                      <input value={doc.ressarcimento.cpfCnpj} inputMode="numeric" onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, cpfCnpj: formatarCpfCnpj(e.target.value) } }))} className={`${INPUT_CLASS} num`} />
                    </label>
                  </>
                )}
                <label className="block">
                  <span className={ROTULO}>Banco</span>
                  <input value={doc.ressarcimento.banco} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, banco: e.target.value } }))} className={INPUT_CLASS} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Agência</span>
                  <input value={doc.ressarcimento.agencia} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, agencia: e.target.value } }))} className={`${INPUT_CLASS} num`} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Conta</span>
                  <input value={doc.ressarcimento.conta} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, conta: e.target.value } }))} className={`${INPUT_CLASS} num`} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Tipo de conta</span>
                  <select value={doc.ressarcimento.tipoConta} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, tipoConta: e.target.value } }))} className={INPUT_CLASS}>
                    <option value="">Não informar</option>
                    {TIPOS_CONTA.filter(Boolean).map((t) => (
                      <option key={t} value={t}>
                        {ROTULO_TIPO_CONTA[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={ROTULO}>Tipo da chave PIX</span>
                  <select value={doc.ressarcimento.tipoChavePix} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, tipoChavePix: e.target.value } }))} className={INPUT_CLASS}>
                    <option value="">Não informar</option>
                    {TIPOS_PIX.filter(Boolean).map((t) => (
                      <option key={t} value={t}>
                        {ROTULO_TIPO_PIX[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className={ROTULO}>Chave PIX</span>
                  <input value={doc.ressarcimento.chavePix} onChange={(e) => mudar((d) => ({ ...d, ressarcimento: { ...d.ressarcimento, chavePix: e.target.value } }))} className={INPUT_CLASS} />
                </label>
              </div>
              {textoRessarcimento(doc, acerto) && <p className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-ink">{textoRessarcimento(doc, acerto)}</p>}
            </div>
          </div>
        </Secao>

        {/* 5 */}
        <Secao id="clausulas" numero={5} titulo="Cláusulas" descricao="O texto vem do modelo (Configurações › Termo de entrega de chaves) e pode ser ajustado só neste termo.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={ROTULO}>Prazo para transferência (dias úteis)</span>
              <input type="number" min={0} max={365} value={doc.clausula.prazoDias} onChange={(e) => mudar((d) => ({ ...d, clausula: { ...d.clausula, prazoDias: Math.max(0, Math.min(365, Math.round(Number(e.target.value) || 0))) } }))} className={`${INPUT_CLASS} num`} />
            </label>
            <label className="block">
              <span className={ROTULO}>Multa diária</span>
              <CampoCentavos valor={doc.clausula.multaDiariaCentavos} aoMudar={(v) => mudar((d) => ({ ...d, clausula: { ...d.clausula, multaDiariaCentavos: v } }))} />
            </label>
            <label className="block">
              <span className={ROTULO}>Local</span>
              <input value={doc.local} onChange={(e) => mudar((d) => ({ ...d, local: e.target.value }))} className={INPUT_CLASS} />
            </label>
            <label className="block">
              <span className={ROTULO}>Data do documento</span>
              <input type="date" value={doc.dataDocumento ?? ""} onChange={(e) => mudar((d) => ({ ...d, dataDocumento: e.target.value || null }))} className={INPUT_CLASS} />
              <span className="mt-1 block text-[11px] text-ink-muted">Em branco, usa a data da entrega.</span>
            </label>
            <label className="block sm:col-span-2 lg:col-span-4">
              <span className={ROTULO}>Cláusula de entrega</span>
              <textarea rows={6} value={doc.clausula.texto} onChange={(e) => mudar((d) => ({ ...d, clausula: { ...d.clausula, texto: e.target.value } }))} className={`${INPUT_CLASS} leading-relaxed`} />
              <span className="mt-1 block text-[11px] text-ink-muted">Variáveis: {VARIAVEIS_CLAUSULA.join(", ")} — o prazo e a multa entram com o número e o valor por extenso automaticamente.</span>
            </label>
            <label className="block sm:col-span-2">
              <span className={ROTULO}>Texto complementar (opcional)</span>
              <textarea rows={3} value={doc.clausula.textoComplementar} onChange={(e) => mudar((d) => ({ ...d, clausula: { ...d.clausula, textoComplementar: e.target.value } }))} className={INPUT_CLASS} />
            </label>
            <label className="block sm:col-span-2">
              <span className={ROTULO}>Observações (opcional)</span>
              <textarea rows={3} value={doc.clausula.observacoes} onChange={(e) => mudar((d) => ({ ...d, clausula: { ...d.clausula, observacoes: e.target.value } }))} className={INPUT_CLASS} />
            </label>
          </div>
          <div className="mt-3 rounded-lg bg-background px-3 py-3 text-xs leading-relaxed text-ink">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Como sai no documento</p>
            {renderizarClausula(doc)}
          </div>
        </Secao>
      </div>

      {/* lateral (computador) */}
      <aside className="hidden lg:block">
        <div className={`${CARD_CLASS} sticky top-6 space-y-4 p-5`}>
          <p className="num text-xs text-ink-muted">
            {codigo} · versão {versao} · rascunho
          </p>
          {resumo}
          {botoes}
          {mensagem && <p className={`text-xs ${mensagem.tipo === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{mensagem.texto}</p>}
          {sujo && !mensagem && <p className="text-xs text-amber-800">Há alterações não salvas.</p>}
          {pendencias.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <p className="font-semibold">Falta para gerar o documento:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {pendencias.slice(0, 6).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      {/* barra fixa (celular) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0 truncate font-semibold text-ink">{acerto.devedor ? `Saldo ${formatarCentavos(acerto.saldoCentavos)} a favor do ${acerto.aFavorDe}` : "Sem saldo a ressarcir"}</span>
          {mensagem ? <span className={mensagem.tipo === "ok" ? "text-emerald-700" : "text-rose-700"}>{mensagem.texto}</span> : sujo ? <span className="shrink-0 text-amber-800">Não salvo</span> : null}
        </div>
        {botoes}
      </div>
    </div>
  );
}
