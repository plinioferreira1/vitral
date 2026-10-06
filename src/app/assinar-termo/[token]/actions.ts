"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registrarAssinaturaTermo(token: string, nomeDigitado: string, assinaturaImagem: string): Promise<{ ok: boolean; erro?: string }> {
  if (!nomeDigitado.trim()) return { ok: false, erro: "Informe seu nome completo." };
  if (!assinaturaImagem) return { ok: false, erro: "Desenhe sua assinatura antes de confirmar." };

  const lista = await headers();
  const ip = lista.get("x-forwarded-for")?.split(",")[0]?.trim() || lista.get("x-real-ip") || "desconhecido";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("termo_entrega_assinatura_registrar", {
    p_token: token,
    p_nome_digitado: nomeDigitado.trim(),
    p_assinatura_imagem: assinaturaImagem,
    p_ip: ip,
  });
  if (error || data !== true) return { ok: false, erro: "Não foi possível registrar a assinatura. O link pode já ter sido usado ou o documento foi alterado." };
  revalidatePath(`/assinar-termo/${token}`);
  return { ok: true };
}
