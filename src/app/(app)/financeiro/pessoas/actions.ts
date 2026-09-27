"use server";

import { checar } from "@/lib/aviso";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/mascaras";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { valorDaLista } from "@/lib/validacao";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function categoriaFornecedorOuNull(formData: FormData, papel: string): string | null {
  if (papel === "cliente") return null;
  const v = String(formData.get("categoria_fornecedor") ?? "").trim();
  return v === "funcionario" || v === "corretor" || v === "prestador_servico" ? v : null;
}

export async function criarPessoaFinanceiro(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const papel = valorDaLista("financeiro_papel_pessoa", formData.get("papel"), "fornecedor");

  const salvou = await checar(
    supabase.from("financeiro_pessoas").insert({
      tenant_id: sessao.tenantId,
      nome,
      cpf_cnpj: formatarCpfCnpj(formData.get("cpf_cnpj")) || null,
      papel,
      categoria_fornecedor: categoriaFornecedorOuNull(formData, papel),
      telefone: formatarTelefone(formData.get("telefone")) || null,
      email: String(formData.get("email") ?? "").trim() || null,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    }),
    "salvar"
  );
  if (!salvou) return;

  revalidatePath("/financeiro/pessoas");
}

export async function editarPessoaFinanceiro(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const papel = valorDaLista("financeiro_papel_pessoa", formData.get("papel"), "fornecedor");

  const atualizou = await checar(
    supabase
      .from("financeiro_pessoas")
      .update({
        nome,
        cpf_cnpj: formatarCpfCnpj(formData.get("cpf_cnpj")) || null,
        papel,
        categoria_fornecedor: categoriaFornecedorOuNull(formData, papel),
        telefone: formatarTelefone(formData.get("telefone")) || null,
        email: String(formData.get("email") ?? "").trim() || null,
        observacoes: String(formData.get("observacoes") ?? "").trim() || null,
      })
      .eq("id", id),
    "atualizar"
  );
  if (!atualizou) return;

  revalidatePath("/financeiro/pessoas");

  const returnTo = String(formData.get("return_to") ?? "");
  if (returnTo.startsWith("/financeiro/")) redirect(returnTo);
}

export async function apagarPessoaFinanceiro(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await checar(supabase.from("financeiro_pessoas").delete().eq("id", id), "excluir");

  revalidatePath("/financeiro/pessoas");
}
