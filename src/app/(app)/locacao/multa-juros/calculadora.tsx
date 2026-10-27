"use client";

import { useMemo, useState } from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { INDICES, PADRAO, calcularAtraso, explicacaoItem, formatarPct, percentual, validarAtraso, type ItemAtraso } from "@/lib/locacao/atraso";
import { valorEmCentavos } from "@/lib/vendas/lembretes";

export type ContratoOpcao = {
  id: string;
  numero: string;
  imovel: string;
  locador: string;
  locatario: string;
  contasEmAberto: ItemAtraso[];
};

type Linha = { chave: number; descricao: string; competencia: string; vencimento: string; valor: string; correcao: string };

const DESCRICOES = ["Aluguel", "Condomínio", "IPTU/TLP", "Água", "Energia", "Gás", "Seguro incêndio", "Fundo de reserva"];
const moeda = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "—");
const valorTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");

let proximaChave = 1;
const novaLinha = (o: Partial<Linha> = {}): Linha => ({ chave: proximaChave++, descricao: "Aluguel", competencia: "", vencimento: "", valor: "", correcao: "", ...o });

export function CalculadoraAtraso({ contratos, hoje, contratoInicial }: { contratos: ContratoOpcao[]; hoje: string; contratoInicial: string }) {
  const inicial = contratos.find((c) => c.id === contratoInicial);
  const [contratoId, setContratoId] = useState(inicial?.id ?? "");
  const [ident, setIdent] = useState({
    contrato: inicial ? `Contrato ${inicial.numero}` : "",
    locatario: inicial?.locatario ?? "",
    locador: inicial?.locador ?? "",
    imovel: inicial?.imovel ?? "",
    seguradora: "",
    observacoes: "",
  });
  const [dataCalculo, setDataCalculo] = useState(hoje);
  const [multa, setMulta] = useState(String(PADRAO.multaPct));
  const [juros, setJuros] = useState(String(PADRAO.jurosMensalPct));
  const [indice, setIndice] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()]);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  const contrato = contratos.find((c) => c.id === contratoId);

  const entrada = useMemo(() => ({
    dataCalculo,
    multaPct: percentual(multa) ?? NaN,
    jurosMensalPct: percentual(juros) ?? NaN,
    indice: indice || null,
    itens: linhas.map((l) => ({
      descricao: l.descricao,
      competencia: l.competencia || null,
      vencimento: l.vencimento,
      valorCentavos: valorEmCentavos(l.valor) ?? NaN,
      correcaoPct: percentual(l.correcao) ?? 0,
    })),
  }), [dataCalculo, multa, juros, indice, linhas]);
  const erros = validarAtraso(entrada);
  const memoria = erros.length ? null : calcularAtraso(entrada);

  const escolherContrato = (id: string) => {
    setContratoId(id);
    const c = contratos.find((x) => x.id === id);
    if (c) setIdent((v) => ({ ...v, contrato: `Contrato ${c.numero}`, locatario: c.locatario, locador: c.locador, imovel: c.imovel }));
  };

  const trazerContas = () => {
    if (!contrato?.contasEmAberto.length) return;
    const novas = contrato.contasEmAberto.map((k) => novaLinha({ descricao: k.descricao, competencia: k.competencia ?? "", vencimento: k.vencimento, valor: valorTexto(k.valorCentavos) }));
    setLinhas((atuais) => [...atuais.filter((l) => l.valor || l.vencimento), ...novas]);
    setAviso({ tipo: "ok", texto: `${novas.length} conta(s) em aberto do contrato incluída(s). Confira os valores.` });
  };

  const mudar = (chave: number, campo: keyof Linha, valor: string) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));

  const gerarPdf = async () => {
    if (!memoria) return;
    setGerando(true);
    setAviso(null);
    try {
      const resposta = await fetch("/locacao/multa-juros/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ident, dataCalculo, multaPct: entrada.multaPct, jurosMensalPct: entrada.jurosMensalPct, indice, itens: entrada.itens }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.erro ?? "Não foi possível gerar o PDF. Tente novamente.");
      }
      const blob = await resposta.blob();
      const nome = /filename="([^"]+)"/.exec(resposta.headers.get("Content-Disposition") ?? "")?.[1] ?? "memoria-multa-juros.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setAviso({ tipo: "ok", texto: "PDF gerado. Confira antes de enviar à seguradora." });
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro instanceof Error ? erro.message : "Não foi possível gerar o PDF." });
    } finally {
      setGerando(false);
    }
  };

  const rotulo = "mb-1 block text-xs font-medium text-ink-muted";
  const secao = "rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5";

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className={secao}>
          <h2 className="text-sm font-semibold text-ink">Contrato e partes</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className={rotulo}>Contrato de locação</span>
              <select className={INPUT_CLASS} value={contratoId} onChange={(e) => escolherContrato(e.target.value)}>
                <option value="">Preencher à mão</option>
                {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero} · {c.locatario || "sem locatário"}{c.imovel ? ` · ${c.imovel}` : ""}</option>)}
              </select>
            </label>
            {(["contrato", "locatario", "locador", "imovel"] as const).map((campo) => (
              <label key={campo} className={campo === "imovel" ? "md:col-span-2" : ""}>
                <span className={rotulo}>{{ contrato: "Identificação do contrato", locatario: "Locatário", locador: "Locador", imovel: "Imóvel" }[campo]}</span>
                <input className={INPUT_CLASS} value={ident[campo]} onChange={(e) => setIdent({ ...ident, [campo]: e.target.value })} />
              </label>
            ))}
            <label className="md:col-span-2">
              <span className={rotulo}>Seguro fiança <span className="font-normal">(seguradora e apólice, opcional)</span></span>
              <input className={INPUT_CLASS} value={ident.seguradora} onChange={(e) => setIdent({ ...ident, seguradora: e.target.value })} placeholder="Ex.: Seguradora · apólice 000000" />
            </label>
          </div>
        </section>

        <section className={secao}>
          <h2 className="text-sm font-semibold text-ink">Critérios do contrato</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className={rotulo}>Data do cálculo</span><input type="date" className={INPUT_CLASS} value={dataCalculo} onChange={(e) => setDataCalculo(e.target.value)} /></label>
            <label><span className={rotulo}>Multa (%)</span><input inputMode="decimal" className={INPUT_CLASS} value={multa} onChange={(e) => setMulta(e.target.value)} /></label>
            <label><span className={rotulo}>Juros ao mês (%)</span><input inputMode="decimal" className={INPUT_CLASS} value={juros} onChange={(e) => setJuros(e.target.value)} /></label>
            <label><span className={rotulo}>Correção monetária</span>
              <select className={INPUT_CLASS} value={indice} onChange={(e) => setIndice(e.target.value)}>
                <option value="">Sem correção</option>
                {INDICES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Confira no contrato. Juros simples, proporcionais aos dias de atraso. {indice ? `Informe em cada débito o ${indice} acumulado do vencimento até a data do cálculo.` : "Com correção, a multa e os juros incidem sobre o valor corrigido."}
          </p>
        </section>

        <section className={secao}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Débitos em atraso</h2>
            <div className="flex flex-wrap gap-2">
              {contrato?.contasEmAberto.length ? <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={trazerContas}>Trazer {contrato.contasEmAberto.length} conta(s) em aberto</button> : null}
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setLinhas((ls) => [...ls, novaLinha({ descricao: ls.at(-1)?.descricao ?? "Aluguel" })])}><Plus size={16} /> Adicionar débito</button>
            </div>
          </div>
          <datalist id="descricoes-debito">{DESCRICOES.map((d) => <option key={d} value={d} />)}</datalist>
          <div className="mt-4 space-y-3">
            {linhas.map((l, i) => (
              <div key={l.chave} className={`grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-2 ${indice ? "lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_auto]" : "lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"}`}>
                <label><span className={rotulo}>Débito {i + 1}</span><input list="descricoes-debito" className={INPUT_CLASS} value={l.descricao} onChange={(e) => mudar(l.chave, "descricao", e.target.value)} /></label>
                <label><span className={rotulo}>Mês de referência</span><input type="month" className={INPUT_CLASS} value={l.competencia} onChange={(e) => mudar(l.chave, "competencia", e.target.value)} /></label>
                <label><span className={rotulo}>Vencimento</span><input type="date" className={INPUT_CLASS} value={l.vencimento} onChange={(e) => mudar(l.chave, "vencimento", e.target.value)} /></label>
                <label><span className={rotulo}>Valor (R$)</span><input inputMode="decimal" placeholder="0,00" className={INPUT_CLASS} value={l.valor} onChange={(e) => mudar(l.chave, "valor", e.target.value)} /></label>
                {indice ? <label><span className={rotulo}>{indice} acum. (%)</span><input inputMode="decimal" placeholder="0" className={INPUT_CLASS} value={l.correcao} onChange={(e) => mudar(l.chave, "correcao", e.target.value)} /></label> : null}
                <div className="flex items-end">
                  <button type="button" aria-label={`Remover débito ${i + 1}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-background hover:text-rose-700 disabled:opacity-40" disabled={linhas.length === 1} onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}><Trash2 size={17} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={secao}>
          <label><span className={rotulo}>Observações para o PDF <span className="font-normal">(opcional)</span></span>
            <textarea rows={3} className={INPUT_CLASS} value={ident.observacoes} onChange={(e) => setIdent({ ...ident, observacoes: e.target.value })} placeholder="Ex.: débitos comunicados ao locatário em 15/10/2026." />
          </label>
        </section>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <section className={secao}>
          <h2 className="text-sm font-semibold text-ink">Resumo</h2>
          {memoria ? (
            <>
              <dl className="mt-4 space-y-2 text-sm">
                {[["Valor original", memoria.totais.original], ...(indice ? [["Correção", memoria.totais.correcao]] : []), [`Multa (${formatarPct(entrada.multaPct)})`, memoria.totais.multa], [`Juros (${formatarPct(entrada.jurosMensalPct)} a.m.)`, memoria.totais.juros]].map(([r, v]) => (
                  <div key={r as string} className="flex justify-between gap-3"><dt className="text-ink-muted">{r}</dt><dd className="tabular-nums">{moeda(v as number)}</dd></div>
                ))}
                <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-semibold"><dt>Total devido</dt><dd className="tabular-nums text-brand">{moeda(memoria.totais.total)}</dd></div>
              </dl>
              <ul className="mt-4 space-y-3 border-t border-border pt-4 text-xs">
                {memoria.itens.map((it, i) => (
                  <li key={i}>
                    <p className="font-semibold text-ink">{it.descricao} · venc. {dataBR(it.vencimento)} · {it.dias} dia{it.dias === 1 ? "" : "s"}</p>
                    {explicacaoItem(it, entrada, moeda).map((t) => <p key={t} className="text-ink-muted">{t}</p>)}
                    <p className="tabular-nums text-ink">Total {moeda(it.totalCentavos)}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-ink-muted">{erros.slice(0, 6).map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          <button type="button" className={`${PRIMARY_BUTTON_CLASS} mt-5 w-full`} disabled={!memoria || gerando} onClick={gerarPdf}>
            <FileDown size={17} /> {gerando ? "Gerando PDF…" : "Gerar memória de cálculo (PDF)"}
          </button>
          {aviso && <p role="status" className={`mt-3 text-xs ${aviso.tipo === "erro" ? "text-rose-700" : "text-emerald-700"}`}>{aviso.texto}</p>}
          <p className="mt-3 text-xs text-ink-muted">O PDF sai no papel timbrado da Sacra, com o critério e a conta de cada débito.</p>
        </section>
      </aside>
    </div>
  );
}
