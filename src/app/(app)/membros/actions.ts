"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CategoriaProcesso, NivelAcesso } from "@/lib/types";

/**
 * Confere que quem está chamando é diretor/gerente, e que o membro
 * alvo é do mesmo tenant. Usado antes de qualquer ação que use o
 * cliente admin (que ignora RLS, então a checagem tem que ser
 * manual aqui).
 */
async function exigirPermissaoSobreMembro(usuarioAlvoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: eu } = await supabase
    .from("usuarios")
    .select("nivel_acesso, tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!eu || !["diretor", "gerente"].includes(eu.nivel_acesso)) {
    redirect(`/membros?erro=${encodeURIComponent("Só diretor ou gerente pode fazer isso.")}`);
  }

  const { data: alvo } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", usuarioAlvoId)
    .single();

  if (!alvo || alvo.tenant_id !== eu.tenant_id) {
    redirect(`/membros?erro=${encodeURIComponent("Membro não encontrado.")}`);
  }

  return { supabase, meuId: user!.id };
}

export async function adicionarMembro(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "corretor");
  const nivelAcesso = String(formData.get("nivel_acesso") ?? "supervisor") as NivelAcesso;
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
  const supabase = await createClient();
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const categorias = formData.getAll("categorias") as CategoriaProcesso[];
  const nivelAcesso = String(formData.get("nivel_acesso") ?? "") || null;

  const { error } = await supabase.rpc("atualizar_categorias_membro", {
    p_usuario_id: usuarioId,
    p_categorias: categorias,
    p_nivel_acesso: nivelAcesso,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/membros");
}

export async function editarEmailMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const novoEmail = String(formData.get("novo_email") ?? "").trim();
  if (!usuarioId || !novoEmail) return;

  const { supabase } = await exigirPermissaoSobreMembro(usuarioId);

  const admin = createAdminClient();
  const { error: errAuth } = await admin.auth.admin.updateUserById(usuarioId, {
    email: novoEmail,
    email_confirm: true,
  });

  if (errAuth) {
    redirect(`/membros?erro=${encodeURIComponent(errAuth.message)}`);
  }

  await supabase.from("usuarios").update({ email: novoEmail }).eq("id", usuarioId);

  revalidatePath("/membros");
}

export async function excluirMembro(formData: FormData) {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  if (!usuarioId) return;

  const { meuId } = await exigirPermissaoSobreMembro(usuarioId);

  if (usuarioId === meuId) {
    redirect(`/membros?erro=${encodeURIComponent("Você não pode excluir seu próprio acesso.")}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(usuarioId);

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  // usuarios referencia auth.users(id) on delete cascade — a linha
  // em usuarios já some sozinha quando a conta é excluída.
  revalidatePath("/membros");
}
