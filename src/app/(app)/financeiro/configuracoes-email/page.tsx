import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Mail, Send } from "lucide-react";
import { adicionarDestinatario, alternarDestinatario, apagarDestinatario, testarEnvioAgora } from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export default async function ConfiguracoesEmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  const { data: destinatarios } = await supabase
    .from("financeiro_email_destinatarios")
    .select("id, email, nome, ativo")
    .order("criado_em");

  const { data: ultimosEnvios } = await supabase
    .from("financeiro_email_envios")
    .select("id, enviado_em, sucesso, erro, destinatarios")
    .order("enviado_em", { ascending: false })
    .limit(5);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          Configurações de E-mail
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          O relatório financeiro diário é enviado automaticamente todo dia às 9h (horário de
          Brasília) pra quem estiver ativo na lista abaixo.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <CabecalhoSecao icon={Mail} titulo="Destinatários" />
        <form action={adicionarDestinatario} className="mb-4 flex flex-wrap gap-2">
          <input name="email" type="email" required placeholder="E-mail" className={`${campoClasse} flex-1`} />
          <input name="nome" placeholder="Nome (opcional)" className={`${campoClasse} w-48`} />
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </button>
        </form>

        <ul className="space-y-1.5">
          {(destinatarios ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum destinatário ainda — adicione pelo menos um pra o envio funcionar.
            </p>
          ) : (
            (destinatarios ?? []).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-ink">{d.email}</p>
                  {d.nome && <p className="text-xs text-ink-muted">{d.nome}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <form action={alternarDestinatario}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="ativo_atual" value={String(d.ativo)} />
                    <button
                      type="submit"
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        d.ativo
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-stone-200 bg-stone-100 text-stone-500"
                      }`}
                    >
                      {d.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </form>
                  <form action={apagarDestinatario}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                      apagar
                    </button>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {usuario?.tenant_id && (
        <form action={testarEnvioAgora} className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <input type="hidden" name="tenant_id" value={usuario.tenant_id} />
          <CabecalhoSecao
            icon={Send}
            titulo="Testar agora"
            descricao="Envia o relatório imediatamente pros destinatários ativos, sem esperar as 9h."
          />
          <button
            type="submit"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
          >
            Enviar teste agora
          </button>
        </form>
      )}

      {(ultimosEnvios ?? []).length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={Mail} titulo="Últimos envios" />
          <ul className="space-y-2 text-sm">
            {(ultimosEnvios ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-ink-muted">
                  {new Date(e.enviado_em).toLocaleString("pt-BR")} · {e.destinatarios.length} destinatário(s)
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.sucesso ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                  title={e.erro ?? undefined}
                >
                  {e.sucesso ? "Enviado" : "Falhou"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
