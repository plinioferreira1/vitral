"use server";

import { avisar, checar } from "@/lib/aviso";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";

import { valorDaLista } from "@/lib/validacao";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterSiteUrl } from "@/lib/site-url";
import type { CategoriaProcesso } from "@/lib/types";

/** Só diretor/gerente mexe em membros; senão volta para a tela com o erro. */
async function exigirGestor() {
  const { user, usuario: eu } = await getUsuarioAtual();
  if (!user || !eu?.tenant_id || !GESTORES.includes(eu.nivel_acesso)) {
    redirect(`/membros?erro=${encodeURIComponent("Só diretor ou gerente pode fazer isso.")}`);
  }
  return { user, eu, tenantId: eu.tenant_id };
}

/**
 * Confere que quem está chamando é diretor/gerente, e que o membro
 * alvo é do mesmo tenant. Usado antes de qualquer ação que use o
 * cliente admin (que ignora RLS, então a checagem tem que ser
 * manual aqui).
 */
async function exigirPermissaoSobreMembro(usuarioAlvoId: string) {
  const { user, eu } = await exigirGestor();
  const supabase = await createClient();

  const { data: alvo } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", usuarioAlvoId)
    .single();

  if (!alvo || alvo.tenant_id !== eu.tenant_id) {
    redirect(`/membros?erro=${encodeURIComponent("Membro não encontrado.")}`);
  }

  return { supabase, meuId: user.id };
}

export async function adicionarMembro(formData: FormData) {
  await exigirGestor();
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const perfil = valorDaLista("perfil_usuario", formData.get("perfil"), "corretor");
  const nivelAcesso = valorDaLista("nivel_acesso_usuario", formData.get("nivel_acesso"), "supervisor");
  const categorias = formData.getAll("categorias") as CategoriaProcesso[];

  const { error } = await supabase.rpc("add_member", {
    p_email: email,
    p_perfil: perfil,
    p_categorias: categorias,
    p_nivel_acesso: nivelAcesso,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/membros");
}

export async function atualizarCategoriasMembro(formData: FormData) {
  const { user, tenantId } = await exigirGestor();
  const supabase = await createClient();
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const categorias = formData.getAll("categorias").map((v) => valorDaLista("categoria_processo", v)).filter((v): v is CategoriaProcesso => v !== null);
  // Nível inválido ou vazio = não mexe no nível (só nas categorias).
  const nivelAcesso = valorDaLista("nivel_acesso_usuario", formData.get("nivel_acesso")) ?? undefined;

  const { data: alvo, error: erroAlvo } = await supabase.from("usuarios").select("nivel_acesso").eq("id", usuarioId).eq("tenant_id", tenantId).single();
  if (erroAlvo || !alvo) {
    await avisar("erro", "Usuário não encontrado nesta empresa.");
    return;
  }
  if (usuarioId === user.id && nivelAcesso && !GESTORES.includes(nivelAcesso)) {
    await avisar("erro", "Você não pode remover seu próprio acesso administrativo.");
    return;
  }
  if (nivelAcesso && GESTORES.includes(nivelAcesso) && !GESTORES.includes(alvo.nivel_acesso) && formData.get("confirmar_administrativo") !== "sim") {
    await avisar("erro", "Confirme a concessão de acesso administrativo.");
    return;
  }

  const { error } = await supabase.rpc("atualizar_categorias_membro", {
    p_usuario_id: usuarioId,
    p_categorias: categorias,
    p_nivel_acesso: nivelAcesso,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/membros");
  revalidatePath("/", "layout");
  await avisar("sucesso", "Acesso atualizado.");
  return true;
}

export async function editarNomeMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const novoNome = String(formData.get("novo_nome") ?? "").trim();
  if (!usuarioId || !novoNome) return;

  const { supabase } = await exigirPermissaoSobreMembro(usuarioId);

  if (!await checar(supabase.from("usuarios").update({ nome: novoNome }).eq("id", usuarioId), "atualizar")) return;

  revalidatePath("/membros");
  await avisar("sucesso", "Nome atualizado.");
  return true;
}

export async function editarEmailMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const novoEmail = String(formData.get("novo_email") ?? "").trim();
  if (!usuarioId || !novoEmail) return;

  const { supabase } = await exigirPermissaoSobreMembro(usuarioId);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect(
      `/membros?erro=${encodeURIComponent(
        "A chave de administrador ainda não está configurada no servidor. Confirme se o redeploy no Vercel já pegou a SUPABASE_SERVICE_ROLE_KEY."
      )}`
    );
  }

  const { error: errAuth } = await admin.auth.admin.updateUserById(usuarioId, {
    email: novoEmail,
    email_confirm: true,
  });

  if (errAuth) {
    redirect(`/membros?erro=${encodeURIComponent(errAuth.message)}`);
  }

  if (!await checar(supabase.from("usuarios").update({ email: novoEmail }).eq("id", usuarioId), "atualizar")) return;

  revalidatePath("/membros");
  await avisar("sucesso", "E-mail de login atualizado.");
  return true;
}

export async function alterarSenhaMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const novaSenha = String(formData.get("nova_senha") ?? "");
  if (!usuarioId || !novaSenha) return;

  if (novaSenha.length < 6) {
    redirect(`/membros?erro=${encodeURIComponent("A senha precisa ter pelo menos 6 caracteres.")}`);
  }

  await exigirPermissaoSobreMembro(usuarioId);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect(
      `/membros?erro=${encodeURIComponent(
        "A chave de administrador ainda não está configurada no servidor. Confirme se o redeploy no Vercel já pegou a SUPABASE_SERVICE_ROLE_KEY."
      )}`
    );
  }

  const { error } = await admin.auth.admin.updateUserById(usuarioId, { password: novaSenha });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/membros");
  await avisar("sucesso", "Senha atualizada.");
  return true;
}

export async function excluirMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  if (!usuarioId) return;

  const { meuId } = await exigirPermissaoSobreMembro(usuarioId);

  if (usuarioId === meuId) {
    redirect(`/membros?erro=${encodeURIComponent("Você não pode excluir seu próprio acesso.")}`);
  }

  const admin = (() => {
    try {
      return createAdminClient();
    } catch {
      redirect(
        `/membros?erro=${encodeURIComponent(
          "A chave de administrador ainda não está configurada no servidor. Confirme se o redeploy no Vercel já pegou a SUPABASE_SERVICE_ROLE_KEY."
        )}`
      );
    }
  })();

  const { error } = await admin.auth.admin.deleteUser(usuarioId);

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  // usuarios referencia auth.users(id) on delete cascade — a linha
  // em usuarios já some sozinha quando a conta é excluída.
  revalidatePath("/membros");
}

export async function criarConvite(formData: FormData) {
  const { user, tenantId } = await exigirGestor();
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const perfil = valorDaLista("perfil_usuario", formData.get("perfil"), "corretor");
  const nivelAcesso = valorDaLista("nivel_acesso_usuario", formData.get("nivel_acesso"), "supervisor");
  const categorias = formData.getAll("categorias").map((v) => valorDaLista("categoria_processo", v)).filter((v): v is CategoriaProcesso => v !== null);

  if (!email) return;
  if (GESTORES.includes(nivelAcesso) && formData.get("confirmar_administrativo") !== "sim") {
    await avisar("erro", "Confirme a concessão de acesso administrativo.");
    return;
  }

  const { error } = await supabase.from("convites").insert({
    tenant_id: tenantId,
    email,
    perfil,
    nivel_acesso: nivelAcesso,
    categorias,
    criado_por: user.id,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/membros");
  await avisar("sucesso", "Convite criado. Copie o link na lista de convites para compartilhá-lo.");
  return true;
}

/** Renova também o token: links antigos deixam de ser válidos. Não dispara e-mail. */
export async function renovarConvite(formData: FormData) {
  const { tenantId } = await exigirGestor();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { data: convite } = await supabase.from("convites").select("id, token").eq("id", id).eq("tenant_id", tenantId).is("usado_em", null).single();
  if (!convite) {
    await avisar("erro", "Convite não encontrado ou já utilizado.");
    return;
  }
  // Convites têm RLS de leitura/inserção/remoção; a renovação é uma escrita
  // restrita no servidor, após conferir gestor, empresa e convite pendente.
  const admin = createAdminClient();
  const ok = await checar(admin.from("convites").update({ token: crypto.randomUUID(), expira_em: new Date(Date.now() + 7 * 86400000).toISOString() }).eq("id", id).eq("tenant_id", tenantId).eq("token", convite.token).is("usado_em", null).select("id").single(), "renovar o convite");
  if (!ok) return;
  await avisar("sucesso", "Link renovado por 7 dias. Copie e compartilhe o novo link.");
  revalidatePath("/membros");
}

export async function redefinirSenhaMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const { supabase } = await exigirPermissaoSobreMembro(usuarioId);
  const { data: alvo } = await supabase.from("usuarios").select("email").eq("id", usuarioId).single();
  if (!alvo) return;
  const siteUrl = await obterSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(alvo.email, { redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha` });
  if (error) {
    await avisar("erro", "Não foi possível enviar o link de redefinição. Tente novamente.");
    return;
  }
  await avisar("sucesso", "Link de redefinição de senha enviado.");
  revalidatePath("/membros");
  return true;
}

export async function cancelarConvite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await exigirGestor();
  const supabase = await createClient();
  await checar(supabase.from("convites").delete().eq("id", id), "excluir");

  revalidatePath("/membros");
}

export async function reenviarRedefinicaoParaTodos() {
  // Antes não havia checagem: qualquer pessoa logada podia disparar
  // e-mails de troca de senha para toda a equipe.
  await exigirGestor();
  const supabase = await createClient();
  const siteUrl = await obterSiteUrl();

  const { data: membrosAtivos } = await supabase
    .from("usuarios")
    .select("email")
    .eq("ativo", true);

  let enviados = 0;
  const falhas: string[] = [];

  for (const m of membrosAtivos ?? []) {
    const { error } = await supabase.auth.resetPasswordForEmail(m.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
    });
    if (error) {
      falhas.push(m.email);
    } else {
      enviados++;
    }
    // Pequena pausa entre envios pra não estourar o limite de
    // e-mails por minuto do provedor padrão do Supabase.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const msg =
    falhas.length === 0
      ? `sucesso=${enviados}`
      : `erro=${encodeURIComponent(
          `Enviado pra ${enviados}, mas falhou pra: ${falhas.join(", ")} (provavelmente limite de envio do Supabase — tenta de novo em alguns minutos).`
        )}`;

  revalidatePath("/membros");
  redirect(`/membros?${msg}`);
}
