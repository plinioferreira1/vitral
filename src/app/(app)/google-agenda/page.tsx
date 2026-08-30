import { createClient } from "@/lib/supabase/server";
import { SincronizarAgendaClient } from "./sincronizar-agenda-client";

export const maxDuration = 60;

export default async function GoogleAgendaPage() {
  const supabase = await createClient();

  const { data: processosRaw } = await supabase
    .from("processos")
    .select("id, numero_processo, imoveis ( endereco )")
    .in("categoria", ["venda", "financiamento", "locacao"]);

  const processos = (processosRaw ?? []).map((p) => {
    const imovel = p.imoveis as unknown as { endereco: string } | null;
    return { id: p.id as string, identificador: imovel?.endereco ?? (p.numero_processo as string) };
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Google Agenda</h1>
        <p className="mt-1 text-sm text-ink-muted">
          A partir de agora, os prazos de etapa e o alerta de contagem regressiva do prazo final
          do contrato (Vendas/Financiamentos) são enviados sozinhos pro Google Agenda sempre que
          algo muda num processo.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Use o botão abaixo pra colocar em dia os processos que já existiam antes dessa
          integração — ele passa por todos e cria/atualiza/limpa os eventos que estiverem
          faltando ou desatualizados. Pode rodar de novo quando quiser, sem duplicar nada.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <p className="mb-4 text-sm text-ink-muted">
          {processos.length} processo{processos.length === 1 ? "" : "s"} de Venda, Financiamento e
          Locação encontrado{processos.length === 1 ? "" : "s"}.
        </p>
        <SincronizarAgendaClient processos={processos} />
      </div>
    </div>
  );
}
