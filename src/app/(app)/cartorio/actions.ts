"use server";

import { createClient } from "@/lib/supabase/server";

export async function registrarSimulacaoCustas(dados: {
  valor: number;
  tipoImovel: "usado" | "novo";
  valorFinanciado: number | null;
  primeiroImovel: boolean;
  instrumentoParticular: boolean;
  total: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!usuario?.tenant_id) return;

  await supabase.from("simulacoes_custas").insert({
    tenant_id: usuario.tenant_id,
    usuario_id: user.id,
    valor: dados.valor,
    tipo_imovel: dados.tipoImovel,
    valor_financiado: dados.valorFinanciado || null,
    primeiro_imovel: dados.primeiroImovel,
    instrumento_particular: dados.instrumentoParticular,
    total: dados.total,
  });
}
