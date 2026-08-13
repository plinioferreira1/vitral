import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { CalendarioGrid } from "@/components/calendario-grid";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { hojeISO } from "@/lib/data-br";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function saudacao(): string {
  const horaBrasilia = new Date().toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  });
  const hora = Number(horaBrasilia);
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, nivel_acesso")
    .eq("id", user?.id ?? "")
    .single();

  if (!usuario) return null;

  const { temVenda, temFinanciamento, temLocacao } = await getPermissoesUsuario(
    supabase,
    user!.id,
    usuario.nivel_acesso
  );

  const eventos = await getEventosCalendario();
  const referencia = new Date(`${hojeISO()}T00:00:00`);
  const mesLabel = format(referencia, "MMMM 'de' yyyy", { locale: ptBR });
  const mesCapitalizado = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const atalhos = [
    ...(temVenda || temFinanciamento
      ? [{ href: "/processos/novo", label: "Novo processo" }]
      : []),
    ...(temLocacao ? [{ href: "/locacao/novo", label: "Novo contrato de locação" }] : []),
    { href: "/autorizacoes/nova", label: "Nova autorização de venda" },
    { href: "/termos-visita/nova", label: "Novo termo de visita" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {saudacao()}, {usuario.nome.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-muted capitalize">{mesCapitalizado}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {atalhos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-xl border border-border/60 bg-surface p-4 text-sm font-medium text-ink shadow-sm transition hover:border-brand hover:bg-background"
          >
            + {a.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-ink">Calendário</p>
        <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={3} />
      </div>
    </div>
  );
}
