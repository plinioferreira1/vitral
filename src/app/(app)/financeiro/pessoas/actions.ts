"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function categoriaFornecedorOuNull(formData: FormData, papel: string): string | null {
  if (papel === "cliente") return null;
  const v = String(formData.get("categoria_fornecedor") ?? "").trim();
  return v === "funcionario" || v === "corretor" || v === "prestador_servico" ? v : null;
}

export async function criarPessoaFinanceiro(formData: FormData) {
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
  if (!nome) return;
  const papel = String(formData.get("papel") ?? "fornecedor");

  await supabase.from("financeiro_pessoas").insert({
    tenant_id: usuario.tenant_id,
    nome,
    cpf_cnpj: String(formData.get("cpf_cnpj") ?? "").trim() || null,
    papel,
    categoria_fornecedor: categoriaFornecedorOuNull(formData, papel),
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  });

  revalidatePath("/financeiro/pessoas");
}

export async function editarPessoaFinanceiro(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const papel = String(formData.get("papel") ?? "fornecedor");

  await supabase
    .from("financeiro_pessoas")
    .update({
      nome,
      cpf_cnpj: String(formData.get("cpf_cnpj") ?? "").trim() || null,
      papel,
      categoria_fornecedor: categoriaFornecedorOuNull(formData, papel),
      telefone: String(formData.get("telefone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    })
    .eq("id", id);

  revalidatePath("/financeiro/pessoas");
}

export async function apagarPessoaFinanceiro(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("financeiro_pessoas").delete().eq("id", id);

  revalidatePath("/financeiro/pessoas");
}
