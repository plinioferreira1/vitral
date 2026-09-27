"use server";

import { exigirUsuario } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

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
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;

  const usuario = sessao.usuario;
  if (!usuario?.tenant_id) return;

  await checar(supabase.from("simulacoes_custas").insert({
    tenant_id: usuario.tenant_id,
    usuario_id: user.id,
    valor: dados.valor,
    tipo_imovel: dados.tipoImovel,
    valor_financiado: dados.valorFinanciado || null,
    primeiro_imovel: dados.primeiroImovel,
    instrumento_particular: dados.instrumentoParticular,
    total: dados.total,
  }), "salvar");
}
