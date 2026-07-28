"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { traduzirErroAuth } from "@/lib/erros-auth";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent(traduzirErroAuth(error.message))}`);
  }

  redirect("/");
}

export async function esqueciSenha(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/redefinir-senha`,
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
