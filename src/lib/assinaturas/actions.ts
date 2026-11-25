"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { caminhoDocumento, mensagemErroLink, TIPOS_LINK, validarNovaValidade, type TipoLink } from "./link";

export type ResultadoLink = { ok: boolean; mensagem: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Revoga ou define a validade de um link de assinatura. A permissão e as
 * regras (documento pendente, assinatura não feita, link não revogado) são
 * conferidas de novo pelo banco em `gerenciar_link_assinatura`, que também
 * grava a auditoria. A assinatura já feita nunca é tocada.
 */
export async function gerenciarLinkAssinatura(_anterior: ResultadoLink | null, form: FormData): Promise<ResultadoLink> {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo || !GESTORES.includes(usuario.nivel_acesso)) {
    return { ok: false, mensagem: "Só gerentes e diretores ativos podem gerenciar links de assinatura." };
  }

  const tipoTexto = String(form.get("tipo") ?? "");
  const tipo = (TIPOS_LINK as readonly string[]).includes(tipoTexto) ? (tipoTexto as TipoLink) : null;
  const acaoTexto = String(form.get("acao") ?? "");
  const acao = acaoTexto === "revogar" || acaoTexto === "definir_validade" ? acaoTexto : null;
  const signatarioId = String(form.get("signatario_id") ?? "");
  const documentoId = String(form.get("documento_id") ?? "");
  if (!tipo || !acao || !UUID.test(signatarioId) || !UUID.test(documentoId)) {
    return { ok: false, mensagem: "Pedido inválido. Atualize a página e tente de novo." };
  }

  let expiraEm: string | undefined;
  if (acao === "definir_validade") {
    const v = validarNovaValidade(String(form.get("expira_em") ?? ""));
    if (!v.ok) return { ok: false, mensagem: v.erro };
    expiraEm = v.iso;
  } else if (form.get("confirmado") !== "sim") {
    return { ok: false, mensagem: "Confirme a revogação antes de continuar." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("gerenciar_link_assinatura", {
    p_tipo: tipo,
    p_signatario_id: signatarioId,
    p_acao: acao,
    ...(expiraEm ? { p_expira_em: expiraEm } : {}),
  });

  revalidatePath(caminhoDocumento(tipo, documentoId));
  if (error) return { ok: false, mensagem: mensagemErroLink(error.message) };
  return {
    ok: true,
    mensagem: acao === "revogar" ? "Link revogado. Ele não abre mais o documento." : "Validade do link atualizada.",
  };
}
