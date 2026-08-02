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
}: {
  href: string;
  label: string;
  value: number;
  accent: string;
  icone: React.ReactNode;
  ativo?: boolean;
  detalhe?: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border border-border bg-surface p-5 transition hover:border-border-strong ${
        ativo ? "ring-2 ring-offset-2 ring-offset-background" : ""
      }`}
      style={{
        borderLeftColor: accent,
        borderLeftWidth: "3px",
        ...(ativo ? ({ ["--tw-ring-color" as string]: accent }) : {}),
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        {icone}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
      {detalhe && <p className="mt-1 text-[10px] text-ink-muted/70">{detalhe}</p>}
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
        accent="#a8a29e"
        icone={Icones.relogio}
      />
      <StatCardLink
        href={hrefPara("atrasada")}
        label="Atrasados"
        value={atrasados.length}
        accent="#fb7185"
        icone={Icones.alerta}
        ativo={filtroAtivo === "atrasada"}
      />
      <StatCardLink
        href={hrefPara("vence_hoje")}
        label="Vencendo hoje"
        value={venceHoje.length}
        accent="#fbbf24"
        icone={Icones.calendario}
        ativo={filtroAtivo === "vence_hoje"}
      />
      <StatCardLink
        href={hrefPara("vence_em_breve")}
        label="Vencendo em 7 dias"
        value={venceEmBreve.length}
        accent="#fcd34d"
        icone={Icones.calendario}
        ativo={filtroAtivo === "vence_em_breve"}
      />
    </div>
  );
}
