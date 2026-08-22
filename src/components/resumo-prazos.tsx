import Link from "next/link";
import { Icones } from "@/components/icone-badge";

export function StatCardLink({
  href,
  label,
  value,
  accent,
  icone,
  ativo,
  detalhe,
  hero,
}: {
  href: string;
  label: string;
  value: number;
  accent: string;
  icone: React.ReactNode;
  ativo?: boolean;
  detalhe?: string;
  hero?: boolean;
}) {
  if (hero) {
    return (
      <Link
        href={href}
        className={`block rounded-2xl p-5 text-white shadow-sm transition hover:brightness-110 ${
          ativo ? "ring-2 ring-offset-2 ring-offset-background" : ""
        }`}
        style={{
          backgroundColor: accent,
          ...(ativo ? ({ ["--tw-ring-color" as string]: accent }) : {}),
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
          {icone}
        </div>
        <p className="mt-3 font-mono text-4xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm font-medium text-white/85">{label}</p>
        {detalhe && <p className="mt-1 text-xs text-white/60">{detalhe}</p>}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`block rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-border-strong hover:shadow-md ${
        ativo ? "ring-2 ring-offset-2 ring-offset-background" : ""
      }`}
      style={ativo ? ({ ["--tw-ring-color" as string]: accent } as React.CSSProperties) : undefined}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: accent, color: "#fff" }}
      >
        {icone}
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
      {detalhe && <p className="mt-1 text-xs text-ink-muted/70">{detalhe}</p>}
    </Link>
  );
}

type EventoResumo = {
  concluida: boolean;
  urgencia: string;
};

/**
 * O "resumão" de 4 cartões (Em aberto / Atrasados / Vencendo hoje /
 * Vencendo em 7 dias) usado no Início e em cada aba de processo.
 * Recebe os eventos já filtrados pra categoria que interessa (ou
 * todos, no caso do Início).
 */
export function ResumoPrazos({
  eventos,
  hrefEmAberto,
  hrefFiltro,
  filtroAtivo,
}: {
  eventos: EventoResumo[];
  hrefEmAberto: string;
  hrefFiltro?: (filtro: "atrasada" | "vence_hoje" | "vence_em_breve") => string;
  filtroAtivo?: string;
}) {
  const pendentes = eventos.filter((e) => !e.concluida);
  const atrasados = pendentes.filter((e) => e.urgencia === "atrasada");
  const venceHoje = pendentes.filter((e) => e.urgencia === "vence_hoje");
  const venceEmBreve = pendentes.filter((e) => e.urgencia === "vence_em_breve");

  const hrefPara = hrefFiltro ?? (() => hrefEmAberto);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCardLink
        href={hrefEmAberto}
        label="Em aberto"
        value={pendentes.length}
        accent="#78716c"
        icone={Icones.relogio}
        ativo={filtroAtivo === "em_aberto"}
      />
      <StatCardLink
        href={hrefPara("atrasada")}
        label="Atrasados"
        value={atrasados.length}
        accent="#e11d48"
        icone={Icones.alerta}
        ativo={filtroAtivo === "atrasada"}
        hero
      />
      <StatCardLink
        href={hrefPara("vence_hoje")}
        label="Vencendo hoje"
        value={venceHoje.length}
        accent="#d97706"
        icone={Icones.calendario}
        ativo={filtroAtivo === "vence_hoje"}
      />
      <StatCardLink
        href={hrefPara("vence_em_breve")}
        label="Vencendo em 7 dias"
        value={venceEmBreve.length}
        accent="#b9822c"
        icone={Icones.calendario}
        ativo={filtroAtivo === "vence_em_breve"}
      />
    </div>
  );
}
