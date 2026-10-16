import { enviarEmail } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";
import { GESTORES } from "@/lib/usuario-atual";
import { gerarLembretes, montarEmailLembretes, MARCOS_CONTRATO, MARCOS_INTERMEDIARIA, type EtapaLembrete, type ProcessoLembrete } from "./lembretes";

type Admin = ReturnType<typeof createAdminClient>;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://vitral.sacraimoveis.com.br";
const CAMPOS_PROCESSO = "id, tenant_id, categoria, status, responsavel_id, numero_processo, data_final_contrato, imoveis ( endereco )";

type LinhaProcesso = Omit<ProcessoLembrete, "endereco"> & { imoveis: { endereco: string | null } | null };
const paraProcesso = (p: LinhaProcesso): ProcessoLembrete => ({ ...p, endereco: p.imoveis?.endereco ?? null });

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Rotina diária (chamada pelo cron das 8h20): cria os lembretes de vendas que
 * ainda não existem e manda um único e-mail por pessoa com os que ainda não
 * foram enviados. Nunca repete um lembrete (chave única no banco) nem um e-mail.
 */
export async function rotinaDiariaLembretesVendas(admin: Admin, hoje: string): Promise<{ criados: number; emails: number; falhasEmail: number }> {
  const [{ data: etapas }, { data: processos }, { data: gestores }] = await Promise.all([
    admin
      .from("etapas")
      .select(`id, nome, status, data_prevista, valor_centavos, processos!inner ( ${CAMPOS_PROCESSO} )`)
      .ilike("nome", "%intermedi%")
      .neq("status", "concluida")
      .gte("data_prevista", hoje)
      .lte("data_prevista", somarDias(hoje, Math.max(...MARCOS_INTERMEDIARIA))),
    admin
      .from("processos")
      .select(CAMPOS_PROCESSO)
      .eq("categoria", "venda")
      .gt("data_final_contrato", hoje)
      .lte("data_final_contrato", somarDias(hoje, Math.max(...MARCOS_CONTRATO))),
    admin.from("usuarios").select("id, tenant_id").in("nivel_acesso", [...GESTORES]).eq("ativo", true),
  ]);

  const gestoresPorEmpresa = new Map<string, string[]>();
  for (const g of gestores ?? []) {
    if (!g.tenant_id) continue;
    gestoresPorEmpresa.set(g.tenant_id, [...(gestoresPorEmpresa.get(g.tenant_id) ?? []), g.id]);
  }

  const listaEtapas: EtapaLembrete[] = (etapas ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    status: e.status,
    data_prevista: e.data_prevista,
    valor_centavos: e.valor_centavos,
    processo: paraProcesso(e.processos as unknown as LinhaProcesso),
  }));
  const novos = gerarLembretes(hoje, listaEtapas, ((processos ?? []) as unknown as LinhaProcesso[]).map(paraProcesso), gestoresPorEmpresa);

  let criados = 0;
  if (novos.length) {
    const { data, error } = await admin
      .from("vendas_lembretes")
      .upsert(novos, { onConflict: "usuario_id,processo_id,tipo,data_referencia,marco", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`lembretes de vendas: ${error.message}`);
    criados = data?.length ?? 0;
  }

  // E-mail: um por pessoa, com tudo o que ainda não foi enviado (só desta semana, para não
  // mandar lembrete velho se o envio ficou parado).
  const { data: pendentes } = await admin
    .from("vendas_lembretes")
    .select("id, usuario_id, tipo, titulo, mensagem, processo_id, usuarios ( nome, email, ativo )")
    .is("email_enviado_em", null)
    .gte("criado_em", `${somarDias(hoje, -6)}T00:00:00Z`);

  const porPessoa = new Map<string, NonNullable<typeof pendentes>>();
  for (const l of pendentes ?? []) porPessoa.set(l.usuario_id, [...(porPessoa.get(l.usuario_id) ?? []), l]);

  let emails = 0;
  let falhasEmail = 0;
  for (const lista of porPessoa.values()) {
    const pessoa = lista[0].usuarios as unknown as { nome: string; email: string | null; ativo: boolean } | null;
    if (!pessoa?.email || pessoa.ativo === false) continue;
    const { assunto, html, texto } = montarEmailLembretes(pessoa.nome, lista, SITE);
    try {
      await enviarEmail({ destinatarios: [pessoa.email], assunto, html, texto });
      await admin.from("vendas_lembretes").update({ email_enviado_em: new Date().toISOString() }).in("id", lista.map((l) => l.id));
      emails++;
    } catch (erro) {
      falhasEmail++;
      console.error("lembretes de vendas: falha no e-mail", erro instanceof Error ? erro.message : erro);
    }
  }
  return { criados, emails, falhasEmail };
}
