import Link from "next/link";
import { CampoMoeda } from "@/components/campo-moeda";
import type { SimulacaoCustas } from "@/lib/types";
import { formatarDataBR } from "@/lib/data-br";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataRelativa(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return formatarDataBR(iso);
}

export function InicioCorretor({
  nome,
  simulacoes,
  whatsappContato,
}: {
  nome: string;
  simulacoes: SimulacaoCustas[];
  whatsappContato: string | null;
}) {
  const primeiroNome = nome.split(" ")[0];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Suas ferramentas de apoio pra passar informações certas pro cliente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 19h16M6 19V9l6-4 6 4v10M10 19v-5h4v5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-3 text-base font-semibold text-ink">Simulação de Custas</p>
          <p className="mt-1 text-xs text-ink-muted">
            ITBI, escritura e registro — gera uma imagem pra enviar pro cliente.
          </p>
          <form action="/cartorio" method="GET" className="mt-3 flex items-center gap-2">
            <CampoMoeda
              name="valor"
              placeholder="Valor do imóvel"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Calcular
            </button>
          </form>
          <Link href="/cartorio" className="mt-2 inline-block text-xs text-brand hover:underline">
            Abrir a ferramenta completa →
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-3 text-base font-semibold text-ink">Calculadora de Proporcionalidade</p>
          <p className="mt-1 text-xs text-ink-muted">
            Rateio de IPTU, condomínio, água, luz e aluguel entre as partes.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/calculadora?tipo=venda"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-medium text-ink hover:bg-border/30"
            >
              Venda
            </Link>
            <Link
              href="/calculadora?tipo=locacao"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-medium text-ink hover:bg-border/30"
            >
              Locação
            </Link>
          </div>
        </div>
      </div>

      {simulacoes.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-ink">Últimas simulações de custas</h2>
          <ul className="divide-y divide-border">
            {simulacoes.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <Link
                    href={`/cartorio?valor=${Math.round(s.valor)}`}
                    className="text-sm font-medium text-ink hover:underline"
                  >
                    {brl(s.valor)}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Total {brl(s.total)}
                    {s.primeiro_imovel ? " · 1º imóvel" : ""}
                    {s.valor_financiado ? " · financiado" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-muted">{dataRelativa(s.criado_em)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-ink">Precisa indicar a Sacra?</h2>
        {whatsappContato ? (
          <a
            href={`https://wa.me/${whatsappContato.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Falar no WhatsApp da Sacra
          </a>
        ) : (
          <p className="text-sm text-ink-muted">Contato institucional ainda não configurado.</p>
        )}
      </div>
    </div>
  );
}
