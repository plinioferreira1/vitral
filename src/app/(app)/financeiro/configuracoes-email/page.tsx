import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { INPUT_CLASS } from "@/components/ui/styles";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Mail, Send } from "lucide-react";
import { adicionarDestinatario, alternarDestinatario, apagarDestinatario, testarEnvioAgora } from "./actions";
import { BotaoEnviar } from "@/components/botao-enviar";

const campoClasse =
  INPUT_CLASS;

export default async function ConfiguracoesEmailPage() {
  const supabase = await createClient();
  const [{ usuario }, { data: destinatarios }, { data: ultimosEnvios }] = await Promise.all([
    // Mesma busca já feita pelo layout nesta renderização — reaproveitada.
    getUsuarioAtual(),
    supabase
      .from("financeiro_email_destinatarios")
      .select("id, email, nome, ativo")
      .order("criado_em"),
    supabase
      .from("financeiro_email_envios")
      .select("id, enviado_em, sucesso, erro, destinatarios, tipo")
      .order("enviado_em", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="financeiro-ui mx-auto max-w-[1100px] space-y-5">
      <CabecalhoPagina titulo="Resumos diários por e-mail" descricao={<> Todo dia às 9h (horário de Brasília) quem estiver ativo na lista abaixo recebe dois e-mails: o resumo
          financeiro e o resumo dos processos (etapas atrasadas, do dia, dos próximos 7 dias e prazos de contrato).
         </>} />

      <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        <CabecalhoSecao icon={Mail} titulo="Destinatários" />
        <form action={adicionarDestinatario} className="mb-4 flex flex-wrap gap-2">
          <input name="email" type="email" required placeholder="E-mail" className={`${campoClasse} flex-1`} />
          <input name="nome" placeholder="Nome (opcional)" className={`${campoClasse} w-48`} />
          <BotaoEnviar
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </BotaoEnviar>
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
                    <BotaoEnviar
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        d.ativo
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-stone-200 bg-stone-100 text-stone-500"
                      }`}
                    >
                      {d.ativo ? "Ativo" : "Inativo"}
                    </BotaoEnviar>
                  </form>
                  <form action={apagarDestinatario}>
                    <input type="hidden" name="id" value={d.id} />
                    <BotaoEnviar className="text-xs text-ink-muted hover:text-rose-600">
                      apagar
                    </BotaoEnviar>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {usuario?.tenant_id && (
        <form action={testarEnvioAgora} className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <input type="hidden" name="tenant_id" value={usuario.tenant_id} />
          <CabecalhoSecao
            icon={Send}
            titulo="Testar agora"
            descricao="Todo dia às 9h saem dois e-mails: o resumo financeiro e o resumo dos processos. Envie um deles agora, sem esperar."
          />
          <div className="flex flex-wrap gap-2">
            <BotaoEnviar
              name="tipo"
              value="financeiro"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
            >
              Testar resumo financeiro
            </BotaoEnviar>
            <BotaoEnviar
              name="tipo"
              value="processos"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
            >
              Testar resumo dos processos
            </BotaoEnviar>
          </div>
        </form>
      )}

      {(ultimosEnvios ?? []).length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={Mail} titulo="Últimos envios" />
          <ul className="space-y-2 text-sm">
            {(ultimosEnvios ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-ink-muted">
                  {e.tipo === "processos" ? "Processos" : "Financeiro"} ·{" "}
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
