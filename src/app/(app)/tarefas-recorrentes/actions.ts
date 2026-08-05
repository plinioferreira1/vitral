"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type TipoRegra = "primeiro_dia_util" | "dia_fixo" | "toda_segunda" | "primeira_segunda";

function regraTexto(tipoRegra: TipoRegra, diaFixo: number | null): string {
  switch (tipoRegra) {
    case "primeiro_dia_util":
      return "1º dia útil do mês";
    case "dia_fixo":
      return `Dia ${diaFixo ?? "?"} (ou dia útil anterior)`;
    case "toda_segunda":
      return "Toda segunda-feira";
    case "primeira_segunda":
      return "Primeira segunda-feira do mês";
    default:
      return "";
  }
}

function periodicidadeDe(tipoRegra: TipoRegra): "mensal" | "semanal" {
  return tipoRegra === "toda_segunda" ? "semanal" : "mensal";
}

export async function adicionarTarefaRecorrente(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!usuario?.tenant_id) return;

  const nome = String(formData.get("nome") ?? "").trim();
  const tipoRegra = String(formData.get("tipo_regra") ?? "primeiro_dia_util") as TipoRegra;
  const diaFixoRaw = formData.get("dia_fixo");
  const diaFixo = tipoRegra === "dia_fixo" && diaFixoRaw ? Number(diaFixoRaw) : null;

  if (!nome) return;

  const { data: maxOrdem } = await supabase
    .from("tarefas_mensais")
    .select("ordem")
    .eq("tenant_id", usuario.tenant_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("tarefas_mensais").insert({
    tenant_id: usuario.tenant_id,
    nome,
    regra: regraTexto(tipoRegra, diaFixo),
    tipo_regra: tipoRegra,
    dia_fixo: diaFixo,
    periodicidade: periodicidadeDe(tipoRegra),
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  });

  revalidatePath("/tarefas-recorrentes");
  revalidatePath("/locacao");
}

export async function editarTarefaRecorrente(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoRegra = String(formData.get("tipo_regra") ?? "primeiro_dia_util") as TipoRegra;
  const diaFixoRaw = formData.get("dia_fixo");
  const diaFixo = tipoRegra === "dia_fixo" && diaFixoRaw ? Number(diaFixoRaw) : null;

  if (!id || !nome) return;

  await supabase
    .from("tarefas_mensais")
    .update({
      nome,
      regra: regraTexto(tipoRegra, diaFixo),
      tipo_regra: tipoRegra,
      dia_fixo: diaFixo,
      periodicidade: periodicidadeDe(tipoRegra),
    })
    .eq("id", id);

  revalidatePath("/tarefas-recorrentes");
  revalidatePath("/locacao");
}

export async function removerTarefaRecorrente(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("tarefas_mensais").delete().eq("id", id);

  revalidatePath("/tarefas-recorrentes");
  revalidatePath("/locacao");
}
