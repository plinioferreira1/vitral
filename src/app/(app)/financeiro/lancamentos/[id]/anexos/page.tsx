import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Paperclip } from "lucide-react";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoAnexoDespesa } from "@/components/financeiro/campo-anexo-despesa";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { enviarAnexo, removerAnexo } from "./actions";

export default async function AnexoDespesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user) redirect("/login");
  if (!usuario?.ativo || !usuario.tenant_id || !GESTORES.includes(usuario.nivel_acesso)) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: despesa }, { data: anexo }] = await Promise.all([
    supabase.from("financeiro_lancamentos").select("descricao, valor, vencimento, recorrencia_id")
      .eq("id", id).eq("tenant_id", usuario.tenant_id).eq("tipo", "despesa").single(),
    supabase.from("financeiro_anexos").select("nome, tamanho, caminho")
      .eq("lancamento_id", id).eq("tenant_id", usuario.tenant_id).maybeSingle(),
  ]);
  if (!despesa) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/financeiro/contas-a-pagar#lista" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand"><ArrowLeft size={16} /> Voltar às despesas</Link>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><Paperclip size={24} className="text-brand" /> Anexo da despesa</h1>
        <p className="mt-2 break-words font-semibold text-ink">{despesa.descricao}</p>
        <p className="mt-1 text-sm text-ink-muted">{Number(despesa.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Vencimento {new Date(`${despesa.vencimento}T12:00:00`).toLocaleDateString("pt-BR")}</p>
        {despesa.recorrencia_id && <p className="mt-2 text-sm text-ink-muted">O anexo pertence somente a esta ocorrência.</p>}
      </div>
      {anexo ? (
        <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-bold text-ink">Arquivo anexado</h2>
          <p className="break-all text-sm text-ink">{anexo.nome} <span className="text-ink-muted">({Math.max(1, Math.round(anexo.tamanho / 1024))} KB)</span></p>
          <div className="flex flex-wrap gap-4">
            <a href={`/financeiro/lancamentos/${id}/anexo`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><ExternalLink size={16} /> Abrir arquivo</a>
            <a href={`/financeiro/lancamentos/${id}/anexo?baixar=1`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><Download size={16} /> Baixar</a>
          </div>
          <form action={removerAnexo}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="caminho" value={anexo.caminho} />
            <BotaoComConfirmacao mensagem="Remover o arquivo anexado? A despesa será mantida." className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700" textoEnviando="Removendo…">Remover anexo</BotaoComConfirmacao>
          </form>
        </section>
      ) : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-ink-muted">Esta despesa ainda não tem um arquivo anexado.</p>}
      <form action={enviarAnexo} className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-bold text-ink">{anexo ? "Substituir arquivo" : "Anexar arquivo"}</h2>
        <CampoAnexoDespesa obrigatorio />
        {anexo && <p className="text-xs text-ink-muted">O arquivo atual só será substituído após o novo envio ser concluído.</p>}
        <BotaoEnviar className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white" textoEnviando="Enviando…">{anexo ? "Substituir anexo" : "Salvar anexo"}</BotaoEnviar>
      </form>
    </div>
  );
}
