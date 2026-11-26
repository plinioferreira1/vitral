"use server";

import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarResumoMatutino } from "@/lib/resumo-matutino-servidor";
import { montarHtmlResumoMatutino } from "@/lib/resumo-matutino";
import { enviarEmail } from "@/lib/email";
import { avisar } from "@/lib/aviso";

/** Envia apenas para o próprio usuário logado, mediante clique explícito. */
export async function enviarTesteResumoMatutino() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo || !usuario.tenant_id || !GESTORES.includes(usuario.nivel_acesso)) {
    await avisar("erro", "Somente gestores ativos podem testar o resumo unificado.");
    return;
  }
  try {
    const db = createAdminClient();
    const { data: destinatario, error } = await db.from("usuarios")
      .select("nome,email,ativo").eq("id",user.id).eq("tenant_id",usuario.tenant_id).single();
    if (error || !destinatario?.ativo || !destinatario.email) throw new Error("Destinatário não encontrado.");
    const r = await carregarResumoMatutino(usuario.tenant_id,user.id,destinatario.nome??"Gestor");
    await enviarEmail({
      destinatarios:[destinatario.email],
      assunto:"[TESTE] VITRAL — Resumo unificado — "+r.dia.split("-").reverse().join("/"),
      html:montarHtmlResumoMatutino(r)
    });
    await avisar("sucesso","Resumo de teste enviado apenas ao seu e-mail. Os envios diários existentes continuam ativos.");
  } catch (e) {
    console.error("Falha no teste do resumo unificado",e instanceof Error?e.message:"erro");
    await avisar("erro","Não foi possível enviar o teste do resumo. Verifique a configuração de e-mail.");
  }
}
