"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function registrarAssinaturaVisita(
  token: string,
  nomeDigitado: string,
  cpf: string,
  rg: string,
  assinaturaImagem: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!nomeDigitado.trim()) {
    return { ok: false, erro: "Informe seu nome completo." };
  }
  if (!assinaturaImagem) {
    return { ok: false, erro: "Desenhe sua assinatura antes de confirmar." };
  }

  const listaHeaders = await headers();
  const ip =
    listaHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    listaHeaders.get("x-real-ip") ||
    "desconhecido";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("termo_visita_registrar", {
    p_token: token,
    p_nome_digitado: nomeDigitado.trim(),
    p_cpf: cpf.trim() || null,
    p_rg: rg.trim() || null,
    p_assinatura_imagem: assinaturaImagem,
    p_ip: ip,
  });

  if (error || data !== true) {
    return {
      ok: false,
      erro: "Não foi possível registrar a assinatura. O link pode já ter sido usado.",
    };
  }

  revalidatePath(`/visita/${token}`);
  return { ok: true };
}
