"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Inbox, RefreshCw, Search, ShieldCheck } from "lucide-react";

type Mensagem = {
  messageId: string;
  subject?: string;
  sender?: string;
  fromAddress?: string;
  summary?: string;
  receivedTime?: string;
  hasAttachment?: string | boolean | number;
};

type Filtro = "todas" | "vitral" | "outras";

function resumoSeguro(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/gi, " ")
    .replace(/\s+/g, " ").trim();
}
function codigoVitral(subject?: string) {
  return /\[VITRAL:([a-f0-9]{16})\]/i.exec(subject ?? "")?.[1]?.toLowerCase() ?? null;
}
function formatarData(timestamp?: string) {
  const value = Number(timestamp);
  return Number.isFinite(value) && value > 0
    ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })
    : "Data não informada";
}

export function CaixaEntradaLocacao() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [atualizacao, setAtualizacao] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/integracoes/zoho/locacao?limit=100", { cache: "no-store", credentials: "same-origin" });
      const dados = await resposta.json() as { messages?: Mensagem[]; error?: string };
      if (!resposta.ok || !Array.isArray(dados.messages)) {
        throw new Error(dados.error || "Não foi possível consultar a caixa de entrada.");
      }
      setMensagens(dados.messages);
      setAtualizacao(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao acessar o Zoho.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const correspondentes = useMemo(() => mensagens.filter(m => codigoVitral(m.subject)), [mensagens]);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return mensagens.filter(m => {
      const vinculada = Boolean(codigoVitral(m.subject));
      if (filtro === "vitral" && !vinculada) return false;
      if (filtro === "outras" && vinculada) return false;
      if (!termo) return true;
      return [m.subject, m.sender, m.fromAddress, m.summary]
        .some(v => resumoSeguro(v).toLocaleLowerCase("pt-BR").includes(termo));
    });
  }, [mensagens, filtro, busca]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-brand-soft p-2 text-brand"><Inbox size={20} /></span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Caixa de entrada · locacao@sacraimoveis.com.br</h2>
            <p className="text-xs text-ink-muted">Visualização em tempo real, somente leitura. Não altera os e-mails no Zoho.</p>
          </div>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-background disabled:opacity-50">
          <RefreshCw size={14} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ["todas", "Mensagens", mensagens.length],
          ["vitral", "Respostas VITRAL", correspondentes.length],
          ["outras", "Outros e-mails", mensagens.length - correspondentes.length],
        ] as const).map(([chave, titulo, total]) => (
          <button type="button" key={chave} onClick={() => setFiltro(chave)}
            aria-pressed={filtro === chave}
            className={`rounded-xl border p-4 text-left transition ${filtro === chave ? "border-brand bg-brand-soft" : "border-border bg-surface hover:bg-background"}`}>
            <span className="block text-xs text-ink-muted">{titulo}</span>
            <span className="mt-1 block text-2xl font-bold text-ink">{total}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input aria-label="Pesquisar e-mails" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por assunto, remetente ou conteúdo..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand" />
        </label>
        <span className="text-xs text-ink-muted">{atualizacao ? `Atualizado em ${atualizacao}` : "Aguardando consulta"}</span>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {erro ? (
          <div role="alert" className="space-y-2 p-6">
            <p className="text-sm font-semibold text-rose-700">Não foi possível carregar os e-mails.</p>
            <p className="text-sm text-ink-muted">{erro}</p>
            <button type="button" onClick={() => void carregar()} className="text-sm font-semibold text-brand hover:underline">Tentar novamente</button>
          </div>
        ) : carregando && mensagens.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Consultando caixa de entrada…</p>
        ) : visiveis.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Nenhuma mensagem encontrada neste filtro.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visiveis.map(m => {
              const codigo = codigoVitral(m.subject);
              const anexos = m.hasAttachment === true || String(m.hasAttachment) === "1";
              return (
                <li key={m.messageId} className="space-y-2 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {codigo && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">Identificador VITRAL</span>}
                    {anexos && <span className="rounded-full bg-background px-2 py-1 text-[11px] text-ink-muted">Com anexo</span>}
                    <span className="ml-auto text-xs text-ink-muted">{formatarData(m.receivedTime)}</span>
                  </div>
                  <p className="break-words text-sm font-semibold text-ink">{resumoSeguro(m.subject) || "Sem assunto"}</p>
                  <p className="break-all text-xs text-ink-muted">{resumoSeguro(m.sender) || "Remetente"} · {resumoSeguro(m.fromAddress)}</p>
                  <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-ink-muted">{resumoSeguro(m.summary)}</p>
                  {codigo && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <span className="text-ink-muted">Referência de solicitação: <code>{codigo}</code> · vínculo contratual ainda não confirmado</span>
                      <Link href="/locacao/debitos?aba=solicitacoes" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                        Conferir solicitações <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-start gap-2 text-xs text-ink-muted">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        <p>A presença do identificador VITRAL não confirma automaticamente o contrato nem o pagamento. A conferência é feita no módulo de solicitações. Nesta etapa não há envio, download de anexos ou alteração de mensagens.</p>
      </div>
    </div>
  );
}
