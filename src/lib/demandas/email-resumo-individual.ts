import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { layoutEmailSacra, botaoEmailSacra, escaparHtmlEmail, EMAIL_SACRA } from "@/lib/email-layout-sacra";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://usevitral.site";
const diaBrasil = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dataBR = (d: string) => d.split("-").reverse().join("/");
type Demanda = { id: string; titulo: string; prazo: string | null; prioridade: string; status: string; responsavel_id: string; tenant_id: string };

export async function enviarResumoIndividualDemandas() {
  const db = createAdminClient();
  const dia = diaBrasil();
  const { data: usuarios, error: erroUsuarios } = await db.from("usuarios")
    .select("id,nome,email,tenant_id").eq("ativo", true).not("email", "is", null);
  if (erroUsuarios) throw new Error("Falha ao consultar colaboradores");
  let enviados = 0, ignorados = 0, falhas = 0;
  for (const usuario of usuarios ?? []) {
    if (!usuario.email?.trim() || !usuario.tenant_id) { ignorados++; continue; }
    const { data: demandas, error } = await db.from("demandas")
      .select("id,titulo,prazo,prioridade,status,responsavel_id,tenant_id")
      .eq("tenant_id", usuario.tenant_id).eq("responsavel_id", usuario.id)
      .is("excluida_em", null).neq("status", "concluida")
      .order("prazo", { ascending: true, nullsFirst: false }).limit(501);
    if (error || !demandas || demandas.length > 500) { falhas++; continue; }
    const minhas = demandas as Demanda[];
    const vencidas = minhas.filter(d => d.prazo && d.prazo < dia);
    const hoje = minhas.filter(d => d.prazo === dia);
    const proximas = minhas.filter(d => !d.prazo || d.prazo > dia);
    // O resumo é útil inclusive quando não há demandas: confirma a agenda livre.
    const { error: reserva } = await db.from("demandas_resumos_individuais")
      .insert({ tenant_id: usuario.tenant_id, usuario_id: usuario.id, dia, situacao: "pendente" });
    if (reserva?.code === "23505") { ignorados++; continue; }
    if (reserva) { falhas++; continue; }
    const linha = (d: Demanda) => {
      const prioridade = d.prioridade?.toLowerCase() || "normal";
      const cor = prioridade === "urgente" ? "#A52828" : prioridade === "alta" ? "#A96215" : EMAIL_SACRA.vinho;
      const prazo = d.prazo ? dataBR(d.prazo) : "Sem prazo";
      return '<li style="margin:0 0 10px"><a style="font-weight:600;color:#731515;text-decoration:none" href="' +
        SITE + '/demandas/' + encodeURIComponent(d.id) + '">' + escaparHtmlEmail(d.titulo) +
        '</a><div style="font-size:12px;color:' + cor + '">Prioridade: ' +
        escaparHtmlEmail(d.prioridade || "Normal") + ' · Prazo: ' + prazo + '</div></li>';
    };
    const secao = (titulo: string, itens: Demanda[], vazio: string) =>
      '<section style="background:#fff;border:1px solid #E8E2DB;border-radius:12px;padding:16px;margin-top:16px">' +
      '<h2 style="font-size:16px;color:#731515;margin:0 0 12px">' + titulo + ' (' + itens.length + ')</h2>' +
      (itens.length ? '<ul style="margin:0;padding-left:20px">' + itens.map(linha).join("") + '</ul>' :
        '<p style="color:#746D68;font-size:13px">' + vazio + '</p>') + '</section>';
    const nome = usuario.nome?.trim().split(/\s+/)[0] || "colaborador";
    const html = layoutEmailSacra("Central de Demandas", "Suas demandas de hoje",
      '<p>Bom dia, <strong>' + escaparHtmlEmail(nome) + '</strong>! Veja sua agenda de ' + dataBR(dia) + '.</p>' +
      '<p style="background:#FAF8F5;border:1px solid #E8E2DB;border-radius:10px;padding:14px">' +
      '<strong>' + hoje.length + '</strong> para hoje · <strong>' + vencidas.length +
      '</strong> vencidas · <strong>' + proximas.length + '</strong> outras pendentes</p>' +
      secao("Vencidas", vencidas, "Nenhuma demanda vencida.") +
      secao("Vencem hoje", hoje, "Nenhuma demanda com prazo para hoje.") +
      secao("Outras demandas em aberto", proximas, "Nenhuma outra demanda pendente.") +
      '<p style="font-size:12px;color:#746D68;margin-top:18px">Este resumo contém apenas demandas atribuídas a você no momento do envio.</p>' +
      botaoEmailSacra("Abrir minhas demandas no VITRAL", SITE + "/demandas"),
      dataBR(dia) + " · Sacra Netimóveis");
    try {
      await enviarEmail({ destinatarios: [usuario.email.trim()], assunto: "Suas demandas do dia — " + dataBR(dia), html });
      await db.from("demandas_resumos_individuais").update({
        situacao: "enviado", enviado_em: new Date().toISOString(), erro: null
      }).eq("tenant_id", usuario.tenant_id).eq("usuario_id", usuario.id).eq("dia", dia);
      enviados++;
    } catch (e) {
      await db.from("demandas_resumos_individuais").update({
        situacao: "erro", erro: (e instanceof Error ? e.message : "Falha de envio").slice(0, 500)
      }).eq("tenant_id", usuario.tenant_id).eq("usuario_id", usuario.id).eq("dia", dia);
      falhas++;
    }
  }
  return { dia, enviados, ignorados, falhas };
}
