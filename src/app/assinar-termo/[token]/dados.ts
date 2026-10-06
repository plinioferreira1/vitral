import { createClient } from "@/lib/supabase/server";
import type { Assinatura, RetratoTermo } from "@/lib/termo-entrega/conteudo";

export type DadosAssinaturaTermo = {
  signatario: { nome_esperado: string; papel: "vendedor" | "comprador"; ja_assinado: boolean; assinado_em: string | null };
  termo: { codigo: string; versao: number; status: string };
  retrato: RetratoTermo;
  assinaturas: Assinatura[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dados do termo para quem tem o link de assinatura (sem login). */
export async function buscarPorToken(token: string): Promise<DadosAssinaturaTermo | null> {
  if (!UUID.test(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("termo_entrega_assinatura_buscar", { p_token: token });
  return (data as unknown as DadosAssinaturaTermo | null) ?? null;
}
