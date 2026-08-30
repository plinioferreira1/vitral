import { createClient } from "@/lib/supabase/server";
import { diagnosticarCredenciaisGoogle } from "@/lib/google-agenda";
import { SincronizarAgendaClient } from "./sincronizar-agenda-client";

export const maxDuration = 60;

function Selo({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      {texto}
    </span>
  );
}

export default async function GoogleAgendaPage() {
  const supabase = await createClient();
  const diagnostico = await diagnosticarCredenciaisGoogle();

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
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Status da configuração
        </p>
        <div className="flex flex-wrap gap-2">
          <Selo ok={diagnostico.emailConfigurado} texto="E-mail da conta de serviço" />
          <Selo ok={diagnostico.chaveConfigurada} texto="Chave privada" />
          <Selo ok={diagnostico.calendarios.venda} texto="Agenda de Vendas" />
          <Selo ok={diagnostico.calendarios.financiamento} texto="Agenda de Financiamento" />
          <Selo ok={diagnostico.calendarios.locacao} texto="Agenda de Locação" />
          <Selo ok={diagnostico.tokenOk} texto="Conexão com o Google" />
        </div>
        {diagnostico.detalhe && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700">
            O Google recusou a conexão: {diagnostico.detalhe}
          </p>
        )}
        {!diagnostico.tokenOk && diagnostico.emailConfigurado && diagnostico.chaveConfigurada && !diagnostico.detalhe && (
          <p className="mt-3 text-xs text-ink-muted">
            Credenciais configuradas, mas não foi possível confirmar a conexão agora.
          </p>
        )}
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
