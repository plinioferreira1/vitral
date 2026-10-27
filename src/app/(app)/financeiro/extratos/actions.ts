"use server";

import { avisar } from "@/lib/aviso";
import type { TablesInsert } from "@/lib/database.types";
import { saldoEmAberto } from "@/lib/financeiro/baixa";
import { conferirConciliacao, descricaoSugerida, ErroExtrato, lerOFX } from "@/lib/financeiro/extrato";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { revalidatePath } from "next/cache";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const centavos = (v: number | string) => Math.round(Number(v) * 100);
const texto = (fd: FormData, nome: string) => String(fd.get(nome) ?? "").trim();

function revalidarFinanceiro() {
  revalidatePath("/financeiro/extratos");
  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro/transferencias");
  revalidatePath("/financeiro");
}

async function recalcularStatus(supabase: Supabase, ids: string[]) {
  if (!ids.length) return;
  const [{ data: lancs }, { data: baixas }] = await Promise.all([
    supabase.from("financeiro_lancamentos").select("id, valor, status").in("id", ids),
    supabase.from("financeiro_baixas").select("lancamento_id, valor").in("lancamento_id", ids),
  ]);
  for (const l of lancs ?? []) {
    if (l.status === "cancelado") continue;
    const pago = (baixas ?? []).filter((b) => b.lancamento_id === l.id).reduce((s, b) => s + centavos(b.valor), 0);
    const status = pago >= centavos(l.valor) ? "pago" : pago > 0 ? "pago_parcial" : "pendente";
    if (status !== l.status) await supabase.from("financeiro_lancamentos").update({ status }).eq("id", l.id);
  }
}

/** Reserva a linha (pendente → conciliado) antes de gravar, para que dois cliques não gerem baixa dupla. */
async function reservarLinha(supabase: Supabase, tenantId: string, linhaId: string, userId: string) {
  const { data } = await supabase
    .from("financeiro_extrato_linhas")
    .update({ status: "conciliado", tratado_por: userId, tratado_em: new Date().toISOString() })
    .eq("id", linhaId)
    .eq("tenant_id", tenantId)
    .eq("status", "pendente")
    .select("id, conta_bancaria_id, data, valor, descricao")
    .maybeSingle();
  return data;
}

async function liberarLinha(supabase: Supabase, linhaId: string) {
  await supabase.from("financeiro_extrato_linhas").update({ status: "pendente", tratado_por: null, tratado_em: null }).eq("id", linhaId);
}

/** Liga a linha a um ou mais lançamentos em aberto: gera as baixas com a data e a conta do extrato. */
export async function conciliarLinha(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const linhaId = texto(fd, "linha_id");
  const ids = [...new Set(fd.getAll("lancamento_id").map(String).filter(Boolean))].slice(0, 20);
  if (!linhaId || !ids.length) {
    await avisar("erro", "Marque ao menos um lançamento para conciliar.");
    return;
  }

  const [{ data: lancs }, { data: baixas }] = await Promise.all([
    supabase.from("financeiro_lancamentos").select("id, tipo, valor, status").eq("tenant_id", sessao.tenantId).in("id", ids),
    supabase.from("financeiro_baixas").select("lancamento_id, valor").in("lancamento_id", ids),
  ]);
  const escolhidos = (lancs ?? [])
    .filter((l) => l.status !== "cancelado")
    .map((l) => ({
      id: l.id,
      tipo: l.tipo,
      saldoCentavos: centavos(saldoEmAberto(Number(l.valor), (baixas ?? []).filter((b) => b.lancamento_id === l.id))),
    }));
  if (escolhidos.length !== ids.length) {
    await avisar("erro", "Algum lançamento escolhido não está mais em aberto. Atualize a tela.");
    return;
  }

  const linha = await reservarLinha(supabase, sessao.tenantId, linhaId, sessao.userId);
  if (!linha) {
    await avisar("erro", "Esta linha já foi tratada.");
    revalidarFinanceiro();
    return;
  }
  const erro = conferirConciliacao(centavos(linha.valor), escolhidos);
  if (erro) {
    await liberarLinha(supabase, linhaId);
    await avisar("erro", erro);
    return;
  }

  const novas: TablesInsert<"financeiro_baixas">[] = escolhidos.map((e) => ({
    tenant_id: sessao.tenantId,
    lancamento_id: e.id,
    valor: e.saldoCentavos / 100,
    data: linha.data,
    conta_bancaria_id: linha.conta_bancaria_id,
    extrato_linha_id: linha.id,
    observacoes: "Conciliado com o extrato",
    criado_por: sessao.userId,
  }));
  const { error } = await supabase.from("financeiro_baixas").insert(novas);
  if (error) {
    console.error("Falha ao conciliar extrato:", error);
    await liberarLinha(supabase, linhaId);
    await avisar("erro", error.message?.includes("saldo") ? error.message : "Não foi possível registrar a baixa. Nada foi alterado.");
    return;
  }
  await recalcularStatus(supabase, ids);
  await avisar("sucesso", ids.length > 1 ? `Linha conciliada com ${ids.length} lançamentos.` : "Linha conciliada.");
  revalidarFinanceiro();
}

async function criarLancamentoDaLinha(
  supabase: Supabase,
  sessao: { tenantId: string; userId: string },
  linha: { id: string; conta_bancaria_id: string; data: string; valor: number; descricao: string },
  dados: { descricao: string; unidadeId: string; categoriaId: string | null }
): Promise<boolean> {
  const tipo = Number(linha.valor) > 0 ? "receita" : "despesa";
  const valor = Math.abs(centavos(linha.valor)) / 100;
  const { data: lanc, error } = await supabase
    .from("financeiro_lancamentos")
    .insert({
      tenant_id: sessao.tenantId,
      tipo,
      descricao: dados.descricao.slice(0, 200),
      valor,
      vencimento: linha.data,
      competencia: linha.data,
      unidade_id: dados.unidadeId,
      categoria_id: dados.categoriaId,
      conta_bancaria_id: linha.conta_bancaria_id,
      observacoes: `Criado a partir do extrato: ${linha.descricao}`.slice(0, 500),
      criado_por: sessao.userId,
    })
    .select("id")
    .single();
  if (error || !lanc) {
    console.error("Falha ao criar lançamento do extrato:", error);
    return false;
  }
  const { error: erroBaixa } = await supabase.from("financeiro_baixas").insert({
    tenant_id: sessao.tenantId,
    lancamento_id: lanc.id,
    valor,
    data: linha.data,
    conta_bancaria_id: linha.conta_bancaria_id,
    extrato_linha_id: linha.id,
    observacoes: "Conciliado com o extrato",
    criado_por: sessao.userId,
  });
  if (erroBaixa) {
    console.error("Falha ao baixar lançamento do extrato:", erroBaixa);
    await supabase.from("financeiro_lancamentos").delete().eq("id", lanc.id);
    return false;
  }
  await supabase.from("financeiro_lancamentos").update({ status: "pago" }).eq("id", lanc.id);
  await supabase.from("financeiro_extrato_linhas").update({ lancamento_criado_id: lanc.id }).eq("id", linha.id);
  return true;
}

async function categoriaValida(supabase: Supabase, tenantId: string, categoriaId: string) {
  if (!categoriaId) return null;
  const { data } = await supabase.from("financeiro_categorias").select("id, tipo").eq("id", categoriaId).eq("tenant_id", tenantId).maybeSingle();
  return data;
}

/** Cria um lançamento já pago a partir da linha (para movimentos que não estavam cadastrados). */
export async function criarDaLinha(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const linhaId = texto(fd, "linha_id");
  const descricao = texto(fd, "descricao");
  const unidadeId = texto(fd, "unidade_id");
  if (!linhaId || !descricao || !unidadeId) {
    await avisar("erro", "Informe a descrição e a empresa do lançamento.");
    return;
  }
  const categoria = await categoriaValida(supabase, sessao.tenantId, texto(fd, "categoria_id"));
  const linha = await reservarLinha(supabase, sessao.tenantId, linhaId, sessao.userId);
  if (!linha) {
    await avisar("erro", "Esta linha já foi tratada.");
    revalidarFinanceiro();
    return;
  }
  const tipo = Number(linha.valor) > 0 ? "receita" : "despesa";
  const ok = await criarLancamentoDaLinha(supabase, sessao, linha, {
    descricao,
    unidadeId,
    categoriaId: categoria && categoria.tipo === tipo ? categoria.id : null,
  });
  if (!ok) {
    await liberarLinha(supabase, linhaId);
    await avisar("erro", "Não foi possível criar o lançamento. Nada foi alterado.");
    return;
  }
  await avisar("sucesso", `${tipo === "receita" ? "Receita" : "Despesa"} criada e conciliada.`);
  revalidarFinanceiro();
}

/** Cria lançamentos para várias linhas marcadas de uma vez, com a descrição sugerida de cada uma. */
export async function criarEmLote(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const ids = [...new Set(fd.getAll("linha_id").map(String).filter(Boolean))].slice(0, 200);
  const unidadeId = texto(fd, "unidade_id");
  if (!ids.length || !unidadeId) {
    await avisar("erro", ids.length ? "Escolha a empresa dos lançamentos." : "Marque as linhas que viram lançamento.");
    return;
  }
  const categoria = await categoriaValida(supabase, sessao.tenantId, texto(fd, "categoria_id"));
  let feitas = 0;
  for (const id of ids) {
    const linha = await reservarLinha(supabase, sessao.tenantId, id, sessao.userId);
    if (!linha) continue;
    const tipo = Number(linha.valor) > 0 ? "receita" : "despesa";
    const ok = await criarLancamentoDaLinha(supabase, sessao, linha, {
      descricao: descricaoSugerida(linha.descricao),
      unidadeId,
      categoriaId: categoria && categoria.tipo === tipo ? categoria.id : null,
    });
    if (ok) feitas++;
    else await liberarLinha(supabase, id);
  }
  await avisar(feitas === ids.length ? "sucesso" : "erro",
    feitas === ids.length ? `${feitas} lançamento(s) criados e conciliados.` : `${feitas} de ${ids.length} linhas viraram lançamento; as demais continuam pendentes.`);
  revalidarFinanceiro();
}

/** Movimento entre contas da própria empresa (ex.: pagamento da fatura do cartão): não é receita nem despesa. */
export async function transferirDaLinha(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const linhaId = texto(fd, "linha_id");
  const outra = texto(fd, "outra_conta_id");
  if (!linhaId || !outra) {
    await avisar("erro", "Escolha a outra conta da transferência.");
    return;
  }
  const linha = await reservarLinha(supabase, sessao.tenantId, linhaId, sessao.userId);
  if (!linha) {
    await avisar("erro", "Esta linha já foi tratada.");
    revalidarFinanceiro();
    return;
  }
  if (outra === linha.conta_bancaria_id) {
    await liberarLinha(supabase, linhaId);
    await avisar("erro", "A outra conta precisa ser diferente da conta do extrato.");
    return;
  }
  const saida = Number(linha.valor) < 0;
  const { error } = await supabase.from("financeiro_transferencias").insert({
    tenant_id: sessao.tenantId,
    conta_origem_id: saida ? linha.conta_bancaria_id : outra,
    conta_destino_id: saida ? outra : linha.conta_bancaria_id,
    valor: Math.abs(centavos(linha.valor)) / 100,
    data: linha.data,
    descricao: descricaoSugerida(linha.descricao),
    extrato_linha_id: linha.id,
    criado_por: sessao.userId,
  });
  if (error) {
    console.error("Falha ao registrar transferência do extrato:", error);
    await liberarLinha(supabase, linhaId);
    await avisar("erro", "Não foi possível registrar a transferência. Nada foi alterado.");
    return;
  }
  await avisar("sucesso", "Transferência registrada e conciliada.");
  revalidarFinanceiro();
}

/** Deixa a linha de fora (ex.: já lançada em outro sistema), sempre com motivo. */
export async function ignorarLinha(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const linhaId = texto(fd, "linha_id");
  const nota = texto(fd, "nota").slice(0, 500);
  if (!linhaId || !nota) {
    await avisar("erro", "Escreva o motivo para deixar a linha de fora.");
    return;
  }
  const { data } = await supabase
    .from("financeiro_extrato_linhas")
    .update({ status: "ignorado", nota, tratado_por: sessao.userId, tratado_em: new Date().toISOString() })
    .eq("id", linhaId)
    .eq("tenant_id", sessao.tenantId)
    .eq("status", "pendente")
    .select("id");
  if (!data?.length) {
    await avisar("erro", "Esta linha já foi tratada.");
  } else {
    await avisar("sucesso", "Linha deixada de fora.");
  }
  revalidarFinanceiro();
}

/** Volta a linha para pendente, desfazendo exatamente o que ela gerou. */
export async function desfazerLinha(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const linhaId = texto(fd, "linha_id");
  const { data: linha } = await supabase
    .from("financeiro_extrato_linhas")
    .select("id, status, lancamento_criado_id")
    .eq("id", linhaId)
    .eq("tenant_id", sessao.tenantId)
    .maybeSingle();
  if (!linha || linha.status === "pendente") {
    revalidarFinanceiro();
    return;
  }
  const { data: baixas } = await supabase.from("financeiro_baixas").select("id, lancamento_id").eq("extrato_linha_id", linha.id);
  const afetados = [...new Set((baixas ?? []).map((b) => b.lancamento_id))];
  if (baixas?.length) {
    const { error } = await supabase.from("financeiro_baixas").delete().eq("extrato_linha_id", linha.id);
    if (error) {
      await avisar("erro", "Não foi possível desfazer. Nada foi alterado.");
      return;
    }
  }
  await supabase.from("financeiro_transferencias").delete().eq("extrato_linha_id", linha.id);
  const criado = linha.lancamento_criado_id;
  await supabase
    .from("financeiro_extrato_linhas")
    .update({ status: "pendente", nota: null, tratado_por: null, tratado_em: null, lancamento_criado_id: null })
    .eq("id", linha.id);
  if (criado) {
    const { data: restantes } = await supabase.from("financeiro_baixas").select("id").eq("lancamento_id", criado).limit(1);
    if (!restantes?.length) await supabase.from("financeiro_lancamentos").delete().eq("id", criado);
  }
  await recalcularStatus(supabase, afetados.filter((id) => id !== criado));
  await avisar("sucesso", "Linha voltou para pendente.");
  revalidarFinanceiro();
}

/** Importa um arquivo OFX exportado pelo banco. Linhas já importadas são puladas. */
export async function importarOFX(fd: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const supabase = await createClient();
  const contaId = texto(fd, "conta_id");
  const arquivo = fd.get("arquivo");
  if (!contaId || !(arquivo instanceof File) || arquivo.size === 0) {
    await avisar("erro", "Escolha a conta e o arquivo OFX.");
    return;
  }
  if (arquivo.size > 5 * 1024 * 1024) {
    await avisar("erro", "Arquivo muito grande (limite de 5 MB).");
    return;
  }
  const { data: conta } = await supabase.from("financeiro_contas_bancarias").select("id").eq("id", contaId).eq("tenant_id", sessao.tenantId).maybeSingle();
  if (!conta) {
    await avisar("erro", "Conta não encontrada.");
    return;
  }
  let lido;
  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    let conteudo = new TextDecoder("utf-8").decode(bytes);
    if (conteudo.includes("�")) conteudo = new TextDecoder("windows-1252").decode(bytes);
    lido = lerOFX(conteudo);
  } catch (e) {
    await avisar("erro", e instanceof ErroExtrato ? e.message : "Não consegui ler este arquivo.");
    return;
  }
  if (!lido.linhas.length) {
    await avisar("erro", "O arquivo não tem movimentos.");
    return;
  }

  const { data: imp, error: erroImp } = await supabase
    .from("financeiro_extrato_importacoes")
    .insert({
      tenant_id: sessao.tenantId,
      conta_bancaria_id: contaId,
      origem: "ofx",
      arquivo_nome: arquivo.name.slice(0, 200),
      periodo_inicio: lido.inicio,
      periodo_fim: lido.fim,
      saldo_final: lido.saldo ? lido.saldo.valorCentavos / 100 : null,
      saldo_data: lido.saldo?.data || null,
      criado_por: sessao.userId,
    })
    .select("id")
    .single();
  if (erroImp || !imp) {
    await avisar("erro", "Não foi possível registrar a importação.");
    return;
  }
  const { data: novas, error } = await supabase
    .from("financeiro_extrato_linhas")
    .upsert(
      lido.linhas.map((l) => ({
        tenant_id: sessao.tenantId,
        conta_bancaria_id: contaId,
        importacao_id: imp.id,
        chave: l.chave,
        data: l.data,
        valor: l.valorCentavos / 100,
        descricao: l.descricao,
      })),
      { onConflict: "conta_bancaria_id,chave", ignoreDuplicates: true }
    )
    .select("id");
  if (error) {
    console.error("Falha ao importar OFX:", error);
    await avisar("erro", "Não foi possível gravar as linhas do extrato.");
    return;
  }
  const n = novas?.length ?? 0;
  await supabase
    .from("financeiro_extrato_importacoes")
    .update({ linhas_novas: n, linhas_repetidas: lido.linhas.length - n })
    .eq("id", imp.id);
  await avisar("sucesso", n ? `${n} linha(s) nova(s) para conciliar${lido.linhas.length - n ? `; ${lido.linhas.length - n} já estavam no sistema` : ""}.` : "Todas as linhas deste arquivo já estavam no sistema.");
  revalidarFinanceiro();
}
