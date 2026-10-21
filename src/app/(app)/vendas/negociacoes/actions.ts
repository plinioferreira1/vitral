"use server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisar, checar } from "@/lib/aviso";
import {
  podeEditarNegociacoes,
  validarCadastro,
} from "@/lib/negociacoes/regras";
import { hojeISO } from "@/lib/data-br";
import { valorDaLista } from "@/lib/validacao";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { reconciliarAgendaProcesso } from "@/lib/google-agenda";

const uuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const texto = (f: FormData, campo: string) => String(f.get(campo) ?? "").trim();
async function sessaoEdicao() {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  const supabase = await createClient();
  const p = await getPermissoesUsuario(supabase, sessao.userId, sessao.nivel);
  if (!podeEditarNegociacoes(sessao.nivel, p.temVenda)) {
    await avisar("erro", "Você não tem permissão para alterar negociações.");
    return null;
  }
  return { ...sessao, supabase };
}
function revalidar(id: string) {
  for (const path of [
    "/",
    "/vendas",
    "/vendas/negociacoes",
    `/vendas/negociacoes/${id}`,
    "/painel-sacra",
    "/minhas-vendas",
  ])
    revalidatePath(path);
}
export async function salvarNegociacao(f: FormData) {
  const s = await sessaoEdicao();
  if (!s) return;
  const id = texto(f, "id");
  if (!uuid(id)) {
    await avisar("erro", "Identificação inválida. Atualize a página.");
    return;
  }
  const dados = {
    cliente_nome: texto(f, "cliente_nome"),
    telefone: texto(f, "telefone"),
    vendedor_nome: texto(f, "vendedor_nome"),
    imovel_endereco: texto(f, "imovel_endereco"),
    corretor_id: texto(f, "corretor_id"),
    responsavel_id: texto(f, "responsavel_id"),
    valor: Number(texto(f, "valor")),
    data_abertura: texto(f, "data_abertura"),
    previsao_fechamento: texto(f, "previsao_fechamento"),
    proxima_acao: texto(f, "proxima_acao"),
    data_acompanhamento: texto(f, "data_acompanhamento"),
    observacoes: texto(f, "observacoes"),
  };
  const erro = validarCadastro(dados, hojeISO());
  if (
    erro ||
    !uuid(dados.responsavel_id) ||
    (dados.corretor_id && !uuid(dados.corretor_id))
  ) {
    await avisar("erro", erro ?? "Escolha um responsável e corretor válidos.");
    return;
  }
  const resultado = await createAdminClient().rpc("vendas_negociacao_salvar", {
    p_id: id,
    p_tenant_id: s.tenantId,
    p_usuario_id: s.userId,
    p_dados: dados,
    p_versao: texto(f, "versao") || undefined,
  });
  if (!(await checar(Promise.resolve(resultado), "salvar negociação"))) return;
  revalidar(id);
  await avisar("sucesso", "Negociação salva.");
  redirect(`/vendas/negociacoes/${id}`);
}
export async function encerrarNegociacao(f: FormData) {
  const s = await sessaoEdicao();
  if (!s) return;
  const id = texto(f, "id");
  const situacao = valorDaLista("situacao_negociacao", f.get("situacao"));
  const modelo = texto(f, "modelo_id");
  if (
    !uuid(id) ||
    !situacao ||
    situacao === "em_andamento" ||
    (situacao === "convertida" && !uuid(modelo))
  ) {
    await avisar("erro", "Confira a situação e o modelo de venda.");
    return;
  }
  const resultado = await createAdminClient().rpc(
    "vendas_negociacao_encerrar",
    {
      p_id: id,
      p_tenant_id: s.tenantId,
      p_usuario_id: s.userId,
      p_situacao: situacao,
      p_modelo_id: modelo || undefined,
      p_motivo: texto(f, "motivo"),
      p_versao: texto(f, "versao") || undefined,
    },
  );
  if (!(await checar(Promise.resolve(resultado), "encerrar negociação")))
    return;
  revalidar(id);
  await avisar(
    "sucesso",
    situacao === "convertida"
      ? "Venda convertida em processo ativo."
      : "Perda registrada.",
  );
  if (resultado.data) {
    const processoId = resultado.data;
    after(() => reconciliarAgendaProcesso(s.supabase, processoId));
    redirect(`/processos/${processoId}`);
  }
  redirect(`/vendas/negociacoes/${id}`);
}
