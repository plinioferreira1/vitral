"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, Inbox, Mail, Paperclip, RefreshCw, Search, ShieldCheck } from "lucide-react";

type Mensagem = {
  messageId: string;
  subject?: string;
  sender?: string;
  fromAddress?: string;
  summary?: string;
  receivedTime?: string;
  hasAttachment?: string | boolean | number;
  imovel?: string;
  contratoId?: string;
};
type Filtro = "todas" | "vitral" | "outras";

const limpar = (valor: unknown) => String(valor ?? "")
  .replace(/<[^>]*>/g, " ").replace(/&(?:amp|lt|gt|quot|nbsp|#39);/gi, " ")
  .replace(/\s+/g, " ").trim();
const codigoVitral = (assunto?: string) =>
  /\[VITRAL:([a-f0-9]{16})\]/i.exec(assunto ?? "")?.[1]?.toLowerCase() ?? null;
const assuntoLimpo = (assunto?: string) =>
  limpar(assunto).replace(/\s*\[VITRAL:[a-f0-9]{16}\]\s*/gi, " ").trim() || "Sem assunto";
const dataBR = (valor?: string) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0
    ? new Date(numero).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "Sem data";
};
const temAnexo = (m: Mensagem) => m.hasAttachment === true || String(m.hasAttachment) === "1";

export function CaixaEntradaLocacao() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [mobileDetalhe, setMobileDetalhe] = useState(false);
  const [atualizacao, setAtualizacao] = useState("");
  const [corpos, setCorpos] = useState<Record<string, string>>({});
  const [abrindo, setAbrindo] = useState(false);
  const [erroLeitura, setErroLeitura] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/integracoes/zoho/locacao?limit=100", {
        cache: "no-store", credentials: "same-origin"
      });
      const dados = await resposta.json() as { messages?: Mensagem[]; error?: string };
      if (!resposta.ok || !Array.isArray(dados.messages))
        throw new Error(dados.error || "Não foi possível consultar o Zoho.");
      setMensagens(dados.messages);
      setAtualizacao(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de conexão com o Zoho.");
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const vitral = useMemo(() => mensagens.filter(m => Boolean(codigoVitral(m.subject))), [mensagens]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return mensagens.filter(m => {
      const vinculo = Boolean(codigoVitral(m.subject));
      if (filtro === "vitral" && !vinculo) return false;
      if (filtro === "outras" && vinculo) return false;
      if (!termo) return true;
      return [m.subject, m.sender, m.fromAddress, m.summary, m.imovel]
        .some(v => limpar(v).toLocaleLowerCase("pt-BR").includes(termo));
    });
  }, [mensagens, filtro, busca]);
  const mensagemAtiva = visiveis.find(m => m.messageId === selecionado) ?? visiveis[0] ?? null;

  useEffect(() => {
    if (!mensagemAtiva) return;
    const id = mensagemAtiva.messageId;
    if (corpos[id] !== undefined) return;
    const controller = new AbortController();
    const buscarCorpo = async () => {
      setAbrindo(true);
      setErroLeitura("");
      try {
        const response = await fetch("/api/integracoes/zoho/locacao?messageId=" + encodeURIComponent(id), {
          credentials: "same-origin", cache: "no-store", signal: controller.signal
        });
        const data = await response.json() as { text?: string; error?: string };
        if (!response.ok || typeof data.text !== "string") throw new Error(data.error || "Mensagem indisponível");
        if (!controller.signal.aborted) setCorpos(prev => ({ ...prev, [id]: data.text! }));
      } catch (e) {
        if (!controller.signal.aborted) setErroLeitura(e instanceof Error ? e.message : "Falha ao carregar e-mail");
      } finally {
        if (!controller.signal.aborted) setAbrindo(false);
      }
    };
    void buscarCorpo();
    return () => controller.abort();
  }, [mensagemAtiva?.messageId, corpos]);

  const pastas = [
    { id: "todas" as const, label: "Caixa de entrada", count: mensagens.length, icon: Inbox },
    { id: "vitral" as const, label: "Solicitações VITRAL", count: vitral.length, icon: Building2 },
    { id: "outras" as const, label: "Outros e-mails", count: mensagens.length - vitral.length, icon: Mail },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">locacao@sacraimoveis.com.br</p>
          <p className="text-xs text-ink-muted">Caixa conectada ao Zoho · somente leitura</p>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-background disabled:opacity-50">
          <RefreshCw size={14} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>
      <div className="grid min-h-[600px] lg:grid-cols-[205px_minmax(280px,390px)_minmax(0,1fr)]">
        <aside className="border-b border-border p-3 lg:border-b-0 lg:border-r">
          <p className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Pastas e filtros</p>
          <nav aria-label="Filtros da caixa de entrada" className="flex gap-1 overflow-auto lg:flex-col">
            {pastas.map(p => {
              const Icone = p.icon;
              return (
                <button key={p.id} type="button" onClick={() => { setFiltro(p.id); setSelecionado(null); setMobileDetalhe(false); }}
                  aria-pressed={filtro === p.id}
                  className={"flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition lg:w-full " +
                    (filtro === p.id ? "bg-brand-soft font-semibold text-brand" : "text-ink-muted hover:bg-background hover:text-ink")}>
                  <span className="flex items-center gap-2 whitespace-nowrap"><Icone size={16} /> {p.label}</span>
                  <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px]">{p.count}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-5 hidden space-y-2 border-t border-border px-3 pt-5 text-xs text-ink-muted lg:block">
            <div className="flex items-center gap-2"><ShieldCheck size={15} /> Sem alterações no Zoho</div>
            <p>Mensagens com um único imóvel identificado mostram seu endereço.</p>
          </div>
        </aside>

        <div className={(mobileDetalhe ? "hidden lg:flex " : "flex ") + "min-w-0 flex-col border-r border-border"}>
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">{pastas.find(p => p.id === filtro)?.label}</h2>
              <span className="text-xs text-ink-muted">{visiveis.length} mensagens</span>
            </div>
            <label className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input value={busca} onChange={e => { setBusca(e.target.value); setSelecionado(null); }}
                aria-label="Pesquisar e-mails" placeholder="Pesquisar e-mails ou imóvel"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand" />
            </label>
          </div>
          {erro ? (
            <div role="alert" className="space-y-2 p-5 text-sm">
              <p className="font-semibold text-rose-700">Falha ao consultar Zoho</p>
              <p className="text-ink-muted">{erro}</p>
              <button type="button" onClick={() => void carregar()} className="font-semibold text-brand hover:underline">Tentar novamente</button>
            </div>
          ) : carregando && !mensagens.length ? (
            <p className="p-6 text-sm text-ink-muted">Carregando mensagens…</p>
          ) : visiveis.length === 0 ? (
            <p className="p-6 text-sm text-ink-muted">Nenhum e-mail neste filtro.</p>
          ) : (
            <ul className="max-h-[650px] divide-y divide-border overflow-y-auto">
              {visiveis.map(m => {
                const ativa = m.messageId === mensagemAtiva?.messageId;
                return (
                  <li key={m.messageId}>
                    <button type="button" onClick={() => { setSelecionado(m.messageId); setMobileDetalhe(true); }}
                      aria-current={ativa ? "true" : undefined}
                      className={"block w-full space-y-1.5 px-4 py-4 text-left transition hover:bg-background " + (ativa ? "bg-brand-soft/60" : "")}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-ink">{limpar(m.sender) || limpar(m.fromAddress) || "Remetente"}</span>
                        <span className="shrink-0 text-[11px] text-ink-muted">{dataBR(m.receivedTime)}</span>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium text-ink">{assuntoLimpo(m.subject)}</p>
                      {m.imovel && <p className="truncate text-[11px] font-semibold text-brand"><Building2 size={12} className="mr-1 inline" />{m.imovel}</p>}
                      <p className="line-clamp-2 text-xs leading-relaxed text-ink-muted">{limpar(m.summary)}</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        {codigoVitral(m.subject) && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">VITRAL</span>}
                        {temAnexo(m) && <Paperclip size={13} className="text-ink-muted" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-auto border-t border-border p-3 text-[11px] text-ink-muted">{atualizacao ? "Última consulta: " + atualizacao : "Conectando ao Zoho"}</p>
        </div>

        <section className={(mobileDetalhe ? "flex " : "hidden lg:flex ") + "min-w-0 flex-col bg-surface"}>
          {mensagemAtiva ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <button type="button" onClick={() => setMobileDetalhe(false)} aria-label="Voltar para mensagens"
                  className="rounded-lg p-2 text-ink-muted hover:bg-background lg:hidden"><ArrowLeft size={18} /></button>
                <span className="text-xs font-medium text-ink-muted">Leitura da mensagem</span>
                {temAnexo(mensagemAtiva) && <span className="ml-auto flex items-center gap-1 text-xs text-ink-muted"><Paperclip size={14} /> Anexo no Zoho</span>}
              </div>
              <div className="max-h-[650px] space-y-5 overflow-y-auto p-5 sm:p-7">
                <div className="space-y-3">
                  <h3 className="break-words text-lg font-semibold leading-snug text-ink">{assuntoLimpo(mensagemAtiva.subject)}</h3>
                  {mensagemAtiva.imovel && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <Building2 size={16} className="text-brand" />
                      <span className="font-semibold text-ink">{mensagemAtiva.imovel}</span>
                      {mensagemAtiva.contratoId && <Link href={"/locacao/" + mensagemAtiva.contratoId} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Ver contrato <ArrowUpRight size={13} /></Link>}
                    </div>
                  )}
                  <div className="space-y-1 border-b border-border pb-4 text-xs text-ink-muted">
                    <p><span className="font-semibold text-ink">De:</span> {limpar(mensagemAtiva.sender)} &lt;{limpar(mensagemAtiva.fromAddress)}&gt;</p>
                    <p><span className="font-semibold text-ink">Recebido:</span> {dataBR(mensagemAtiva.receivedTime)}</p>
                  </div>
                </div>
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                  {corpos[mensagemAtiva.messageId] ?? (abrindo ? "Carregando mensagem completa…" : limpar(mensagemAtiva.summary) || "Sem conteúdo disponível.")}
                </div>
                {erroLeitura && <p role="alert" className="border-t border-border pt-4 text-xs text-rose-700">Não foi possível abrir o conteúdo completo: {erroLeitura}. Exibindo a prévia.</p>}
                <p className="border-t border-border pt-4 text-xs text-ink-muted">Leitura em texto seguro, sem carregar imagens ou scripts externos. Anexos permanecem disponíveis no Zoho.</p>
                {codigoVitral(mensagemAtiva.subject) && (
                  <div className="rounded-lg bg-background p-3 text-xs text-ink-muted">
                    <p className="font-semibold text-ink">Referência de solicitação VITRAL</p>
                    <p className="mt-1 font-mono">{codigoVitral(mensagemAtiva.subject)}</p>
                    <Link href="/locacao/debitos?aba=solicitacoes" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand hover:underline">Conferir solicitação <ArrowUpRight size={13} /></Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-ink-muted">
              <Mail size={30} />
              <p className="text-sm font-semibold">Selecione uma mensagem</p>
              <p className="text-xs">O assunto, o imóvel relacionado e a prévia aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-ink-muted">
        <ShieldCheck size={15} className="shrink-0" />
        Leitura segura: não envia, exclui ou marca e-mails como lidos no Zoho.
      </div>
    </div>
  );
}
