import { notFound } from "next/navigation";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { carregarResumoMatutino } from "@/lib/resumo-matutino-servidor";
import { montarHtmlResumoMatutino } from "@/lib/resumo-matutino";
import { enviarTesteResumoMatutino } from "@/lib/resumo-matutino-actions";
import { BotaoEnviar } from "@/components/botao-enviar";

export const dynamic="force-dynamic";

export default async function ResumoMatutinoTestePage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo || !usuario.tenant_id || !GESTORES.includes(usuario.nivel_acesso)) notFound();

  const resumo=await carregarResumoMatutino(usuario.tenant_id,user.id,usuario.nome??"Gestor");
  const html=montarHtmlResumoMatutino(resumo);
  return <div className="space-y-5">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">Laboratório de e-mails · Apenas gestores</p>
      <h1 className="text-2xl font-bold">Resumo matutino unificado</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">Prévia dos quatro relatórios em um só e-mail: Financeiro, suas demandas, processos e lembretes de vendas. O teste é enviado apenas para o seu endereço de usuário. Nenhum envio automático existente é desativado nesta etapa.</p>
    </header>
    <form action={enviarTesteResumoMatutino} className="flex flex-wrap items-center gap-3">
      <BotaoEnviar className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:opacity-90" textoEnviando="Enviando teste…">Enviar e-mail de teste para mim</BotaoEnviar>
      <span className="text-xs text-muted-foreground">Ações urgentes e avisos de atribuição continuam independentes.</span>
    </form>
    <iframe title="Prévia segura do resumo diário" srcDoc={html} sandbox="" className="h-[1100px] w-full rounded-xl border border-border bg-white" />
  </div>;
}
