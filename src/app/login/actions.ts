"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { traduzirErroAuth } from "@/lib/erros-auth";
import { obterSiteUrl } from "@/lib/site-url";

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent(traduzirErroAuth(error.message))}`);
  }

  redirect("/");
}

export async function cadastrar(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const conviteToken = String(formData.get("convite") ?? "").trim();

  const supabase = await createClient();

  if (!conviteToken) {
    redirect(`/login?erro=${encodeURIComponent("Você precisa de um link de convite pra criar conta.")}`);
  }

  const { data: conviteRaw } = await supabase
    .rpc("convite_validar", { p_token: conviteToken })
    .maybeSingle();
  const convite = conviteRaw as { email: string; valido: boolean; nome_empresa: string } | null;

  if (!convite || !convite.valido || convite.email.toLowerCase() !== email.toLowerCase()) {
    redirect(
      `/login?convite=${encodeURIComponent(conviteToken)}&erro=${encodeURIComponent(
        "Esse link de convite não é válido ou já expirou. Peça um novo link pra quem já usa o sistema."
      )}`
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) {
    redirect(
      `/login?convite=${encodeURIComponent(conviteToken)}&erro=${encodeURIComponent(traduzirErroAuth(error.message))}`
    );
  }

  redirect("/");
}

export async function esqueciSenha(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const siteUrl = await obterSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });

  if (error) {
    redirect(`/login?modo=esqueci&erro=${encodeURIComponent(traduzirErroAuth(error.message))}`);
  }

  redirect(`/login?modo=esqueci&enviado=1`);
}

export async function redefinirSenha(formData: FormData) {
  const novaSenha = String(formData.get("senha") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error) {
    redirect(`/redefinir-senha?erro=${encodeURIComponent(traduzirErroAuth(error.message))}`);
  }

  redirect("/login?redefinida=1");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
