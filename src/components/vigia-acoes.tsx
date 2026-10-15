"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { decidirVigia, podeRecarregarSozinho, type AcaoAcompanhada, type DiagnosticoTelaPresa } from "@/lib/vigia-acoes";

const CHAVE_RECARGA = "vitral_vigia_recarga";
const ENDPOINT = "/api/diagnostico/tela-presa";

type Acompanhamento = AcaoAcompanhada & {
  inicio: number;
  diag: Omit<DiagnosticoTelaPresa, "msOcupadaAposResposta" | "ocupados" | "visivel" | "recarregouSozinho" | "msAteFimDoCorpo" | "bytes" | "corpoInterrompido" | "erros" | "idsNoHead"> & { bytes: number | null; corpoInterrompido: boolean };
};

type Global = typeof window & { __vitralVigia?: boolean };

const errosRecentes: string[] = [];
function registrarErro(mensagem: unknown) {
  const texto = mensagem instanceof Error ? `${mensagem.name}: ${mensagem.message}` : String(mensagem ?? "");
  if (!texto) return;
  errosRecentes.push(texto.slice(0, 200));
  if (errosRecentes.length > 3) errosRecentes.shift();
}

function idsNoHead(): string[] {
  return Array.from(document.head.querySelectorAll<HTMLElement>("[id]"))
    .slice(0, 10)
    .map((el) => `${el.tagName.toLowerCase()}#${el.id}`);
}

function lerUltimaRecarga(): { caminho: string; em: number } | null {
  try {
    const v = sessionStorage.getItem(CHAVE_RECARGA);
    return v ? (JSON.parse(v) as { caminho: string; em: number }) : null;
  } catch {
    return null;
  }
}

function descreverOcupados(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-aguardando-gravacao]"))
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()} ${(el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60)}`);
}

/** A tela está esperando uma gravação? (BotaoEnviar e editores marcam data-aguardando-gravacao) */
function telaOcupada(): boolean {
  return document.querySelector("[data-aguardando-gravacao]") !== null;
}

/**
 * Vigia global: acompanha cada Server Action. Se a resposta já chegou e a tela
 * continua "Salvando…" por tempo demais, registra um diagnóstico no servidor e
 * recarrega a página (a gravação já foi concluída, recarregar só lê de novo).
 * Nunca repete a gravação.
 */
export function VigiaAcoes() {
  const [aviso, setAviso] = useState<null | "recarregando" | "manual">(null);

  useEffect(() => {
    const w = window as Global;
    if (w.__vitralVigia) return;
    w.__vitralVigia = true;

    window.addEventListener("error", (e) => registrarErro(e.error ?? e.message));
    window.addEventListener("unhandledrejection", (e) => registrarErro(e.reason));

    let atual: Acompanhamento | null = null;
    let pendentes = 0;
    let timer: number | null = null;

    const parar = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      atual = null;
    };

    const intervir = (a: Acompanhamento, agora: number) => {
      const caminho = location.pathname;
      const recarregar = podeRecarregarSozinho(lerUltimaRecarga(), caminho, Date.now());
      const fim = a.corpoTerminouEm;
      const diagnostico: DiagnosticoTelaPresa = {
        ...a.diag,
        msAteFimDoCorpo: fim === null ? null : fim - a.inicio,
        msOcupadaAposResposta: agora - (fim ?? a.cabecalhoEm),
        ocupados: descreverOcupados(),
        visivel: document.visibilityState === "visible",
        recarregouSozinho: recarregar,
        erros: [...errosRecentes],
        idsNoHead: idsNoHead(),
      };
      try {
        navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(diagnostico)], { type: "application/json" }));
      } catch {
        /* diagnóstico é extra; segue sem ele */
      }
      if (recarregar) {
        try {
          sessionStorage.setItem(CHAVE_RECARGA, JSON.stringify({ caminho, em: Date.now() }));
        } catch {
          /* sem sessionStorage: ainda assim recarrega uma vez */
        }
        setAviso("recarregando");
        window.setTimeout(() => window.location.reload(), 1200);
      } else {
        setAviso("manual");
      }
    };

    const verificar = () => {
      if (!atual) return parar();
      const agora = performance.now();
      const decisao = decidirVigia(atual, agora, telaOcupada(), pendentes);
      if (decisao === "encerrar") return parar();
      if (decisao === "intervir") {
        const a = atual;
        parar();
        intervir(a, agora);
      }
    };

    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let idAcao: string | null = null;
      try {
        const cabecalhos = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        idAcao = cabecalhos.get("next-action");
      } catch {
        idAcao = null;
      }
      if (!idAcao) return original(input, init);

      const inicio = performance.now();
      pendentes++;
      let res: Response;
      try {
        res = await original(input, init);
      } finally {
        pendentes--;
      }
      try {
        const cabecalhoEm = performance.now();
        const acompanhamento: Acompanhamento = {
          inicio,
          cabecalhoEm,
          corpoTerminouEm: null,
          diag: {
            caminho: location.pathname,
            acao: idAcao.slice(0, 12),
            status: res.status,
            redirecionamento: res.headers.get("x-action-redirect"),
            revalidou: res.headers.get("x-action-revalidated"),
            tipoConteudo: res.headers.get("content-type"),
            msAteCabecalho: cabecalhoEm - inicio,
            bytes: null,
            corpoInterrompido: false,
          },
        };
        atual = acompanhamento;
        // Lê uma cópia da resposta só para saber quando ela terminou de chegar.
        const copia = res.clone();
        void (async () => {
          let bytes = 0;
          try {
            const leitor = copia.body?.getReader();
            if (leitor) {
              for (;;) {
                const { done, value } = await leitor.read();
                if (done) break;
                bytes += value?.byteLength ?? 0;
              }
            }
          } catch {
            acompanhamento.diag.corpoInterrompido = true;
          }
          acompanhamento.diag.bytes = bytes;
          acompanhamento.corpoTerminouEm = performance.now();
        })();
        if (timer === null) timer = window.setInterval(verificar, 1000);
      } catch {
        /* o vigia nunca pode atrapalhar a ação */
      }
      return res;
    };
  }, []);

  if (!aviso) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-[70] mx-auto flex w-[min(92vw,30rem)] items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg">
      <RotateCw size={18} strokeWidth={2} className={`mt-0.5 shrink-0 ${aviso === "recarregando" ? "animate-spin" : ""}`} />
      <div className="min-w-0 flex-1">
        {aviso === "recarregando" ? (
          <p>A gravação foi concluída, mas a tela não atualizou. Atualizando a página…</p>
        ) : (
          <>
            <p>A gravação foi concluída, mas a tela não atualizou.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-2 font-semibold underline underline-offset-2">
              Atualizar a página
            </button>
          </>
        )}
      </div>
    </div>
  );
}
