"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar, checar } from "@/lib/aviso";
import { ROTULO_TIPO, tipoLocatario } from "@/lib/ficha-locacao/campos";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function excluirFichasLocacao(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const ids = [...new Set(formData.getAll("ids").map(String))];
  if (!ids.length || ids.length > 100 || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    await avisar("erro", "Selecione de 1 a 100 fichas para excluir.");
    return;
  }
  const admin = createAdminClient() as unknown as SupabaseClient;
  const tenantId = sessao.tenantId;
  const consulta = await admin.from("fichas_cadastrais_locacao").select("id").eq("tenant_id", tenantId).in("id", ids);
  if (!await checar(Promise.resolve(consulta), "conferir as fichas")) return;
  if (consulta.data?.length !== ids.length) {
    await avisar("erro", "Uma das fichas não está mais disponível. Atualize a lista e selecione novamente.");
    return;
  }
  // A exclusão do titular apaga fichas vinculadas por CASCADE. Exige que
  // todas tenham sido incluídas na confirmação, inclusive após mudanças na lista.
  const vinculadas = await admin.from("fichas_cadastrais_locacao").select("id, tenant_id").in("ficha_principal_id", ids);
  if (!await checar(Promise.resolve(vinculadas), "conferir as pessoas vinculadas")) return;
  if (vinculadas.data?.some((f) => f.tenant_id !== tenantId || !ids.includes(f.id))) {
    await avisar("erro", "Há pessoas vinculadas fora da seleção. Atualize a lista e selecione o titular novamente.");
    return;
  }
  const documentos = await admin.from("ficha_locacao_documentos").select("caminho_storage").in("ficha_id", ids);
  if (!await checar(Promise.resolve(documentos), "conferir os anexos")) return;
  if (documentos.data?.some((d) => !String(d.caminho_storage).startsWith(`${tenantId}/`))) {
    await avisar("erro", "Há um anexo com vínculo inconsistente. A exclusão foi interrompida.");
    return;
  }
  const exclusao = await admin.from("fichas_cadastrais_locacao").delete().eq("tenant_id", tenantId).in("id", ids).select("id");
  if (!await checar(Promise.resolve(exclusao), "excluir as fichas")) return;
  if (!exclusao.data?.length) {
    await avisar("erro", "Nenhuma ficha foi excluída. Atualize a lista.");
    return;
  }
  // Os registros saem primeiro: uma falha no banco nunca deixa uma ficha
  // existente sem seus anexos. Arquivos residuais continuam privados.
  const caminhos = (documentos.data ?? []).map((d) => String(d.caminho_storage));
  let limpezaOk = true;
  for (let inicio = 0; inicio < caminhos.length; inicio += 100) {
    const lote = caminhos.slice(inicio, inicio + 100);
    try {
      const { error } = await admin.storage.from("fichas-locacao").remove(lote);
      if (error) throw error;
    } catch (erro) {
      console.error("Falha ao limpar anexos de fichas excluídas", { caminhos: lote, erro });
      limpezaOk = false;
    }
  }
  revalidatePath("/locacao/ficha-cadastral", "layout");
  await avisar(limpezaOk ? "sucesso" : "erro", limpezaOk
    ? `${ids.length} ficha${ids.length === 1 ? " excluída" : "s excluídas"}. Os links de preenchimento foram desativados.`
    : "As fichas foram excluídas, mas houve falha na limpeza dos anexos privados. Avise a gestão para concluir a limpeza.");
}

export async function criarFichaLocacao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao?.usuario.tenant_id) return;
  const nome = String(formData.get("proponente_nome") ?? "").trim();
  const email = String(formData.get("proponente_email") ?? "").trim().toLowerCase();
  const imovel = String(formData.get("imovel_referencia") ?? "").trim();
  const validade = Math.min(90, Math.max(1, Number(formData.get("validade_dias") ?? 30)));
  if (!nome || !email || !imovel) {
    await avisar("erro", "Preencha o nome, o e-mail e o imóvel de interesse.");
    return;
  }
  const supabase = await createClient() as unknown as SupabaseClient;
  const { data, error } = await supabase.from("fichas_cadastrais_locacao").insert({
    tenant_id: sessao.usuario.tenant_id, proponente_nome: nome, proponente_email: email,
    imovel_referencia: imovel, criado_por: sessao.user.id,
    expira_em: new Date(Date.now() + validade * 86400000).toISOString(),
    dados: { nome_completo: nome, email, imovel_interesse: imovel },
  }).select("id").single();
  if (!await checar(Promise.resolve({ error }), "criar a ficha")) return;
  if (!data) {
    await avisar("erro", "Não foi possível criar a ficha. Tente novamente.");
    return;
  }
  revalidatePath("/locacao/ficha-cadastral");
  redirect(`/locacao/ficha-cadastral/${data.id}`);
}

export async function cancelarFichaLocacao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao?.usuario.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient() as unknown as SupabaseClient;
  await supabase.from("fichas_cadastrais_locacao").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("id", id).eq("tenant_id", sessao.usuario.tenant_id);
  revalidatePath("/locacao/ficha-cadastral");
  revalidatePath(`/locacao/ficha-cadastral/${id}`);
}

/**
 * Abre a ficha de mais uma pessoa da mesma proposta (corresponsável ou
 * fiador). Cada pessoa preenche e assina a própria ficha, por um link só dela.
 */
export async function adicionarPessoaFicha(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao?.usuario.tenant_id) return;
  const principalId = String(formData.get("ficha_principal_id") ?? "");
  const nome = String(formData.get("proponente_nome") ?? "").trim().slice(0, 200);
  const email = String(formData.get("proponente_email") ?? "").trim().toLowerCase().slice(0, 254);
  const telefone = String(formData.get("proponente_telefone") ?? "").trim().slice(0, 30);
  const tipo = tipoLocatario(formData.get("tipo_locatario"), "fiador");
  if (!nome || tipo === "titular") { await avisar("erro", "Informe o nome e se a pessoa é corresponsável ou fiador."); return; }
  const supabase = await createClient() as unknown as SupabaseClient;
  const { data: principal } = await supabase.from("fichas_cadastrais_locacao").select("id, imovel_referencia, expira_em, status, tipo_locatario").eq("id", principalId).eq("tenant_id", sessao.usuario.tenant_id).maybeSingle();
  if (!principal || principal.tipo_locatario !== "titular" || principal.status === "cancelada") { await avisar("erro", "A ficha do titular não está disponível."); return; }
  // O link novo vale pelo menos 15 dias, mesmo que o do titular esteja perto de vencer.
  const expira = new Date(Math.max(new Date(principal.expira_em).getTime(), Date.now() + 15 * 86400000)).toISOString();
  const dados: Record<string, string> = { nome_completo: nome };
  if (email) dados.email = email;
  if (telefone) dados.telefone = telefone;
  const ok = await checar(supabase.from("fichas_cadastrais_locacao").insert({
    tenant_id: sessao.usuario.tenant_id, proponente_nome: nome, proponente_email: email || null,
    imovel_referencia: principal.imovel_referencia, criado_por: sessao.user.id, expira_em: expira,
    tipo_locatario: tipo, ficha_principal_id: principal.id, dados,
  }), "criar a ficha");
  if (!ok) return;
  await avisar("sucesso", `Ficha de ${ROTULO_TIPO[tipo].toLowerCase()} criada. Copie o link e envie para ${nome}.`);
  revalidatePath("/locacao/ficha-cadastral");
  revalidatePath(`/locacao/ficha-cadastral/${principal.id}`);
}
