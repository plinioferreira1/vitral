"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Bell, Calendar, AlertTriangle, Clock3, CheckCircle2 } from "lucide-react";

export interface NotificacaoTopBar {
  id: string;
  processoId: string;
  etapa: string;
  contexto: string;
  prazo: string;
  tipo: "atrasada" | "hoje" | "proxima";
}

export function TopBar({
  dataFormatada,
  notificacoes = [],
  totalNotificacoes = 0,
  limparTodasAction,
}: {
  dataFormatada: string;
  notificacoes?: NotificacaoTopBar[];
  totalNotificacoes?: number;
  limparTodasAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fecharAoClicarFora(evento: MouseEvent) {
      if (!notificacoesRef.current?.contains(evento.target as Node)) {
        setNotificacoesAbertas(false);
      }
    }
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setNotificacoesAbertas(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (termo.trim().length < 2) return;
    router.push(`/buscar?q=${encodeURIComponent(termo.trim())}`);
  }

  return (
    <div className="flex items-center gap-3">
      <form onSubmit={buscar} className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          type="text"
          placeholder="Buscar processo, imóvel, cliente..."
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-brand focus:bg-surface focus:ring-1 focus:ring-brand"
        />
      </form>

      <div ref={notificacoesRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Abrir notificações"
          aria-expanded={notificacoesAbertas}
          onClick={() => setNotificacoesAbertas((abertas) => !abertas)}
          className={`relative rounded-lg border p-2.5 transition ${
            notificacoesAbertas
              ? "border-brand bg-brand-soft text-brand"
              : "border-border bg-surface text-ink-muted hover:border-brand/40 hover:text-ink"
          }`}
        >
          <Bell size={17} strokeWidth={2} />
        {totalNotificacoes > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {totalNotificacoes > 9 ? "9+" : totalNotificacoes}
          </span>
        )}
        </button>

        {notificacoesAbertas && (
          <div className="fixed inset-x-4 top-20 z-50 max-h-[min(70vh,560px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">Notificações</p>
                <p className="text-xs text-ink-muted">Prazos vencidos e dos próximos 7 dias</p>
              </div>
              {totalNotificacoes > 0 && (
                <form
                  action={limparTodasAction}
                  onSubmit={() => setNotificacoesAbertas(false)}
                >
                  <button
                    type="submit"
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft"
                  >
                    Limpar tudo
                  </button>
                </form>
              )}
            </div>

            <div className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={21} />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink">Tudo em dia</p>
                  <p className="mt-1 text-xs text-ink-muted">Nenhum prazo exige sua atenção agora.</p>
                </div>
              ) : (
                notificacoes.map((notificacao) => {
                  const atrasada = notificacao.tipo === "atrasada";
                  const venceHoje = notificacao.tipo === "hoje";
                  const Icone = atrasada ? AlertTriangle : Clock3;
                  return (
                    <Link
                      key={notificacao.id}
                      href={`/processos/${notificacao.processoId}#etapa-${notificacao.id}`}
                      onClick={() => setNotificacoesAbertas(false)}
                      className="flex gap-3 rounded-xl p-3 transition hover:bg-background"
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        atrasada
                          ? "bg-rose-50 text-rose-600"
                          : venceHoje
                            ? "bg-amber-50 text-amber-700"
                            : "bg-sky-50 text-sky-700"
                      }`}>
                        <Icone size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{notificacao.etapa}</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">{notificacao.contexto}</span>
                        <span className={`mt-1 block text-xs font-medium ${
                          atrasada ? "text-rose-600" : venceHoje ? "text-amber-700" : "text-sky-700"
                        }`}>
                          {notificacao.prazo}
                        </span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink-muted sm:flex">
        <Calendar size={15} strokeWidth={2} />
        <span>{dataFormatada}</span>
      </div>
    </div>
  );
}
