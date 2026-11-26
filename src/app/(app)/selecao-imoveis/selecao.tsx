"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileDown, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  foraDoPerfil,
  linksDeBusca,
  portalDoLink,
  repetidos,
  TIPOS_IMOVEL,
  type Anuncio,
  type Perfil,
} from "@/lib/vendas/selecao-imoveis";

const CHAVE = "vitral:selecao-imoveis:v1";
const CAMPO = `${INPUT_CLASS} mt-1 min-h-11`;

const PERFIL_VAZIO: Perfil = {
  cliente: "", finalidade: "venda", tipo: "Apartamento", regiao: "", precoMax: null, quartos: null, vagas: null, areaMin: null, financiamento: false,
};

const numero = (v: string): number | null => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const mostrar = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
const novoId = () => Math.random().toString(36).slice(2, 10);

type Rascunho = { perfil: Perfil; anuncios: Anuncio[]; mensagem: string };

/** Ferramenta de seleção: tudo fica no navegador de quem usa (rascunho local); o PDF é gerado no servidor. */
export function SelecaoImoveis() {
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VAZIO);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [carregado, setCarregado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Rascunho local: volta ao reabrir a tela no mesmo navegador.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) {
        const r = JSON.parse(salvo) as Rascunho;
        queueMicrotask(() => {
          setPerfil({ ...PERFIL_VAZIO, ...r.perfil });
          setAnuncios(Array.isArray(r.anuncios) ? r.anuncios : []);
          setMensagem(r.mensagem ?? "");
        });
      }
    } catch {
      /* rascunho inválido: começa do zero */
    }
    queueMicrotask(() => setCarregado(true));
  }, []);
  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ perfil, anuncios, mensagem } satisfies Rascunho));
    } catch {
      /* sem armazenamento local: segue sem rascunho */
    }
  }, [perfil, anuncios, mensagem, carregado]);

  const buscas = useMemo(() => linksDeBusca(perfil), [perfil]);
  const duplicados = useMemo(() => repetidos(anuncios), [anuncios]);
  const enviaveis = anuncios.filter((a) => !duplicados.has(a.id));

  const atualizar = (id: string, campo: keyof Anuncio, valor: string) =>
    setAnuncios((lista) =>
      lista.map((a) =>
        a.id !== id ? a : { ...a, [campo]: ["preco", "condominio", "area", "quartos", "vagas"].includes(campo) ? numero(valor) : valor },
      ),
    );

  async function gerarPdf() {
    setAviso(null);
    setGerando(true);
    try {
      const resposta = await fetch("/selecao-imoveis/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil, anuncios: enviaveis, mensagem }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.erro ?? "Não foi possível gerar o PDF. Tente novamente.");
      }
      const blob = await resposta.blob();
      const nome = /filename="([^"]+)"/.exec(resposta.headers.get("Content-Disposition") ?? "")?.[1] ?? "imoveis-selecionados.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setAviso({ tipo: "ok", texto: "PDF gerado. Confira os valores com os anúncios antes de enviar ao cliente." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Não foi possível gerar o PDF." });
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="perfil-titulo">
        <h2 id="perfil-titulo" className="mb-3 text-sm font-semibold text-ink">1. Perfil do cliente</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-ink-muted sm:col-span-2">
            Nome do cliente
            <input value={perfil.cliente} onChange={(e) => setPerfil({ ...perfil, cliente: e.target.value })} maxLength={120} className={CAMPO} />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Finalidade
            <select value={perfil.finalidade} onChange={(e) => setPerfil({ ...perfil, finalidade: e.target.value === "aluguel" ? "aluguel" : "venda" })} className={CAMPO}>
              <option value="venda">Comprar</option>
              <option value="aluguel">Alugar</option>
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Tipo
            <select value={perfil.tipo} onChange={(e) => setPerfil({ ...perfil, tipo: e.target.value })} className={CAMPO}>
              {TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted sm:col-span-2">
            Região ou bairro
            <input value={perfil.regiao} onChange={(e) => setPerfil({ ...perfil, regiao: e.target.value })} placeholder="Ex.: Águas Claras, Sudoeste, Guará II" maxLength={120} className={CAMPO} />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            {perfil.finalidade === "aluguel" ? "Aluguel até (R$)" : "Preço até (R$)"}
            <input inputMode="decimal" value={mostrar(perfil.precoMax)} onChange={(e) => setPerfil({ ...perfil, precoMax: numero(e.target.value) })} className={CAMPO} />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Área mínima (m²)
            <input inputMode="decimal" value={mostrar(perfil.areaMin)} onChange={(e) => setPerfil({ ...perfil, areaMin: numero(e.target.value) })} className={CAMPO} />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Quartos (mínimo)
            <input inputMode="numeric" value={mostrar(perfil.quartos)} onChange={(e) => setPerfil({ ...perfil, quartos: numero(e.target.value) })} className={CAMPO} />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Vagas (mínimo)
            <input inputMode="numeric" value={mostrar(perfil.vagas)} onChange={(e) => setPerfil({ ...perfil, vagas: numero(e.target.value) })} className={CAMPO} />
          </label>
          {perfil.finalidade === "venda" && (
            <label className="flex min-h-11 items-center gap-2 self-end text-sm text-ink">
              <input type="checkbox" checked={perfil.financiamento} onChange={(e) => setPerfil({ ...perfil, financiamento: e.target.checked })} className="h-5 w-5" />
              Vai financiar
            </label>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="busca-titulo">
        <h2 id="busca-titulo" className="text-sm font-semibold text-ink">2. Pesquisar nos portais</h2>
        <p className="mb-3 mt-1 text-xs text-ink-muted">Cada botão abre uma pesquisa em uma nova aba, com o perfil acima. O Vitral não acessa os portais.</p>
        <div className="flex flex-wrap gap-2">
          {buscas.map((b) => (
            <a key={b.portal} href={b.url} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON_CLASS} min-h-11 gap-1.5`}>
              <Search size={14} aria-hidden="true" /> {b.portal}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="anuncios-titulo">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="anuncios-titulo" className="text-sm font-semibold text-ink">3. Anúncios escolhidos ({enviaveis.length})</h2>
          <button
            type="button"
            onClick={() => setAnuncios((l) => [...l, { id: novoId(), link: "", titulo: "", endereco: "", preco: null, condominio: null, area: null, quartos: null, vagas: null, observacao: "" }])}
            disabled={anuncios.length >= 30}
            className={`${SECONDARY_BUTTON_CLASS} min-h-11 gap-1.5`}
          >
            <Plus size={14} aria-hidden="true" /> Adicionar anúncio
          </button>
        </div>
        {anuncios.length === 0 && <p className="text-sm text-ink-muted">Abra um portal, escolha um anúncio, copie o link e clique em “Adicionar anúncio”.</p>}
        <ol className="space-y-3">
          {anuncios.map((a, i) => {
            const portal = a.link ? portalDoLink(a.link) : null;
            const linkRuim = a.link.trim() !== "" && !portal;
            const repetidoDe = duplicados.get(a.id);
            const avisos = foraDoPerfil(a, perfil);
            return (
              <li key={a.id} className={`rounded-xl border p-3 ${repetidoDe ? "border-amber-300 bg-amber-50/60" : "border-border/70 bg-background"}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink-muted">
                    Anúncio {i + 1}{portal ? ` · ${portal.nome}` : ""}
                    {repetidoDe && <span className="ml-2 text-amber-800">Parece o mesmo imóvel do anúncio {anuncios.findIndex((x) => x.id === repetidoDe) + 1} — fica fora do PDF</span>}
                  </p>
                  <div className="flex gap-2">
                    {portal && (
                      <a href={a.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-brand hover:underline sm:min-h-0">
                        Abrir <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                    <button type="button" onClick={() => setAnuncios((l) => l.filter((x) => x.id !== a.id))} aria-label={`Remover anúncio ${i + 1}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-rose-50 hover:text-rose-700 sm:h-8 sm:w-8">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="text-xs font-medium text-ink-muted sm:col-span-2 lg:col-span-6">
                    Link do anúncio
                    <input value={a.link} onChange={(e) => atualizar(a.id, "link", e.target.value)} placeholder="https://…" className={CAMPO} aria-invalid={linkRuim} />
                    {linkRuim && <span className="mt-1 block text-rose-700">Use o link https de um dos portais da lista acima.</span>}
                  </label>
                  <label className="text-xs font-medium text-ink-muted sm:col-span-2 lg:col-span-3">
                    Título
                    <input value={a.titulo} onChange={(e) => atualizar(a.id, "titulo", e.target.value)} maxLength={140} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted sm:col-span-2 lg:col-span-3">
                    Endereço
                    <input value={a.endereco} onChange={(e) => atualizar(a.id, "endereco", e.target.value)} maxLength={200} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted">
                    Preço (R$)
                    <input inputMode="decimal" value={mostrar(a.preco)} onChange={(e) => atualizar(a.id, "preco", e.target.value)} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted">
                    Condomínio (R$)
                    <input inputMode="decimal" value={mostrar(a.condominio)} onChange={(e) => atualizar(a.id, "condominio", e.target.value)} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted">
                    Área (m²)
                    <input inputMode="decimal" value={mostrar(a.area)} onChange={(e) => atualizar(a.id, "area", e.target.value)} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted">
                    Quartos
                    <input inputMode="numeric" value={mostrar(a.quartos)} onChange={(e) => atualizar(a.id, "quartos", e.target.value)} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted">
                    Vagas
                    <input inputMode="numeric" value={mostrar(a.vagas)} onChange={(e) => atualizar(a.id, "vagas", e.target.value)} className={CAMPO} />
                  </label>
                  <label className="text-xs font-medium text-ink-muted sm:col-span-2 lg:col-span-6">
                    Observação para o cliente (opcional)
                    <input value={a.observacao} onChange={(e) => atualizar(a.id, "observacao", e.target.value)} maxLength={400} className={CAMPO} />
                  </label>
                </div>
                {avisos.length > 0 && <p className="mt-2 text-xs text-amber-800">Fora do perfil: {avisos.join(", ")}.</p>}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="pdf-titulo">
        <h2 id="pdf-titulo" className="text-sm font-semibold text-ink">4. Apresentação para o cliente</h2>
        <label className="mt-3 block text-xs font-medium text-ink-muted">
          Mensagem de abertura (opcional)
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={800} rows={3} className={`${INPUT_CLASS} mt-1`} />
        </label>
        {aviso && (
          <p role={aviso.tipo === "erro" ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-sm ${aviso.tipo === "erro" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
            {aviso.texto}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void gerarPdf()} disabled={gerando || enviaveis.length === 0 || !perfil.cliente.trim()} className={`${PRIMARY_BUTTON_CLASS} min-h-11 gap-1.5 disabled:opacity-50`}>
            {gerando ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <FileDown size={15} aria-hidden="true" />}
            {gerando ? "Gerando…" : "Gerar PDF"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (anuncios.length && !window.confirm("Apagar o perfil e os anúncios desta seleção?")) return;
              setPerfil(PERFIL_VAZIO); setAnuncios([]); setMensagem(""); setAviso(null);
            }}
            className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted hover:text-rose-700"
          >
            Começar nova seleção
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">A seleção fica guardada só neste navegador até você começar outra. Nada é gravado no Vitral.</p>
      </section>
    </div>
  );
}
