import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { hojeISO } from "@/lib/data-br";
import {
  DIAS_PROXIMAS_ETAPAS,
  DIAS_PRAZO_CONTRATO,
  descreverDias,
  montarResumoProcessos,
  type EtapaResumo,
  type ItemEtapa,
  type ItemPrazo,
  type ProcessoResumo,
  type ResumoProcessos,
} from "@/lib/resumo-processos";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://vitral.sacraimoveis.com.br";
const MAX_LINHAS = 15;

const CATEGORIA: Record<string, string> = {
  venda: "Venda",
  financiamento: "Financiamento",
  locacao: "Locação",
  marketing: "Marketing",
};

function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function escapar(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardResumo(rotulo: string, valor: number, cor = "#1c1917", fundo = "#ffffff") {
  return `
    <td style="width:25%;padding:0 5px 12px 5px;">
      <div style="background:${fundo};border:1px solid #e7e2dc;border-radius:14px;padding:14px 14px;">
        <div style="font-size:11px;line-height:15px;color:#78716c;text-transform:uppercase;letter-spacing:.05em;">${rotulo}</div>
        <div style="margin-top:6px;font-size:22px;line-height:26px;font-weight:700;color:${cor};">${valor}</div>
      </div>
    </td>
  `;
}

function secao(titulo: string, conteudo: string, total: number, vazio: string) {
  return `
    <div style="background:#ffffff;border:1px solid #e7e2dc;border-radius:16px;padding:18px;margin-top:14px;">
      <div style="font-size:15px;line-height:20px;font-weight:800;color:#1c1917;">${titulo}</div>
      ${
        total === 0
          ? `<div style="margin-top:12px;border-radius:12px;background:#f8f6f3;padding:16px;color:#78716c;font-size:13px;">${vazio}</div>`
          : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:8px;border-collapse:collapse;">${conteudo}</table>`
      }
      ${
        total > MAX_LINHAS
          ? `<div style="padding-top:10px;color:#78716c;font-size:12px;">+ ${total - MAX_LINHAS} outros no Vitral.</div>`
          : ""
      }
    </div>
  `;
}

function linhasEtapas(itens: ItemEtapa[], cor: string) {
  return itens
    .slice(0, MAX_LINHAS)
    .map(
      (i) => `
        <tr>
          <td style="width:84px;padding:12px 0;border-bottom:1px solid #eee9e3;color:#78716c;font-size:12px;white-space:nowrap;vertical-align:top;">${dataBR(i.data)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #eee9e3;">
            <a href="${SITE}/processos/${i.processoId}" style="font-size:13px;line-height:18px;color:#1c1917;font-weight:700;text-decoration:none;">${escapar(i.imovel)}</a>
            <div style="font-size:12px;line-height:16px;color:#57534e;">${escapar(i.etapa)}</div>
            <div style="font-size:11px;line-height:16px;color:#a8a29e;">${CATEGORIA[i.categoria] ?? escapar(i.categoria)}${
              i.responsavel ? ` · ${escapar(i.responsavel)}` : ""
            }</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee9e3;color:${cor};font-size:12px;font-weight:700;text-align:right;white-space:nowrap;vertical-align:top;">${descreverDias(i.dias)}</td>
        </tr>
      `
    )
    .join("");
}

function linhasPrazos(itens: ItemPrazo[]) {
  return itens
    .slice(0, MAX_LINHAS)
    .map((p) => {
      const cor = p.dias <= 15 ? "#b91c1c" : "#b45309";
      const texto = p.dias < 0 ? `venceu ${descreverDias(p.dias)}` : p.dias === 0 ? "vence hoje" : `vence ${descreverDias(p.dias)}`;
      return `
        <tr>
          <td style="width:84px;padding:12px 0;border-bottom:1px solid #eee9e3;color:#78716c;font-size:12px;white-space:nowrap;">${dataBR(p.data)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #eee9e3;">
            <a href="${SITE}/processos/${p.processoId}" style="font-size:13px;line-height:18px;color:#1c1917;font-weight:700;text-decoration:none;">${escapar(p.imovel)}</a>
            <div style="font-size:11px;line-height:16px;color:#a8a29e;">${CATEGORIA[p.categoria] ?? escapar(p.categoria)}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee9e3;color:${cor};font-size:12px;font-weight:700;text-align:right;white-space:nowrap;">${texto}</td>
        </tr>
      `;
    })
    .join("");
}

/** HTML do e-mail (separado para permitir prévia/teste). */
export function montarHtmlResumoProcessos(r: ResumoProcessos, hoje: string): string {
  return `
      <div style="margin:0;padding:0;background:#f4f0ea;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f0ea;">
          <tr>
            <td align="center" style="padding:28px 14px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:760px;border-collapse:collapse;">
                <tr>
                  <td style="background:#731515;border-radius:22px 22px 0 0;padding:26px 28px;">
                    <div style="font-size:12px;line-height:16px;color:#f5d7d7;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Vitral Processos</div>
                    <div style="margin-top:8px;font-size:28px;line-height:34px;color:#ffffff;font-weight:800;">Resumo diário</div>
                    <div style="margin-top:6px;font-size:14px;line-height:20px;color:#f8e9e9;">${dataBR(hoje)} · Sacra Netimóveis</div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#fffaf4;border:1px solid #e7e2dc;border-top:0;border-radius:0 0 22px 22px;padding:22px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        ${cardResumo("Em andamento", r.processosEmAndamento)}
                        ${cardResumo("Etapas atrasadas", r.atrasadas.length, "#b91c1c", "#fff1f2")}
                        ${cardResumo("Vencem hoje", r.hoje.length, "#b45309", "#fffbeb")}
                        ${cardResumo("Contratos a vencer", r.prazosContrato.length, "#731515")}
                      </tr>
                    </table>

                    ${secao("Etapas atrasadas", linhasEtapas(r.atrasadas, "#b91c1c"), r.atrasadas.length, "Nenhuma etapa atrasada.")}
                    ${secao("Vencem hoje", linhasEtapas(r.hoje, "#b45309"), r.hoje.length, "Nenhuma etapa vence hoje.")}
                    ${secao(
                      `Próximos ${DIAS_PROXIMAS_ETAPAS} dias`,
                      linhasEtapas(r.proximos, "#57534e"),
                      r.proximos.length,
                      `Nenhuma etapa nos próximos ${DIAS_PROXIMAS_ETAPAS} dias.`
                    )}
                    ${secao(
                      "Prazo final do contrato",
                      linhasPrazos(r.prazosContrato),
                      r.prazosContrato.length,
                      `Nenhum contrato vencendo nos próximos ${DIAS_PRAZO_CONTRATO} dias.`
                    )}

                    <div style="margin-top:18px;padding:16px;border-radius:16px;background:#f8f6f3;color:#78716c;font-size:12px;line-height:18px;">
                      Este e-mail é enviado automaticamente pelo Vitral, todo dia de manhã, para os mesmos destinatários do
                      resumo financeiro. Para ajustar quem recebe, acesse Financeiro → Cadastros → E-mails.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
}

/**
 * Monta e envia o resumo diário dos processos (etapas atrasadas, de hoje,
 * dos próximos dias e prazos finais de contrato) para os mesmos
 * destinatários do e-mail financeiro. Registra o resultado em
 * financeiro_email_envios com tipo "processos".
 */
export async function enviarResumoProcessosDiario(tenantId: string) {
  const supabase = createAdminClient();
  const hoje = hojeISO();
  const limite = new Date(`${hoje}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + DIAS_PROXIMAS_ETAPAS);
  const limiteStr = limite.toISOString().slice(0, 10);

  const { data: destinatarios } = await supabase
    .from("financeiro_email_destinatarios")
    .select("email")
    .eq("tenant_id", tenantId)
    .eq("ativo", true);
  const listaDestinatarios = (destinatarios ?? []).map((d) => d.email);

  try {
    if (listaDestinatarios.length === 0) {
      throw new Error("Nenhum destinatário ativo cadastrado.");
    }

    const { data: processosRaw, error: erroProcessos } = await supabase
      .from("processos")
      .select("id, numero_processo, categoria, data_final_contrato, imoveis ( endereco )")
      .eq("tenant_id", tenantId)
      .eq("status", "ativo");
    if (erroProcessos) throw new Error(erroProcessos.message);

    const processos: ProcessoResumo[] = (processosRaw ?? []).map((p) => ({
      id: p.id,
      numero_processo: p.numero_processo,
      categoria: p.categoria,
      endereco: (p.imoveis as { endereco: string } | null)?.endereco ?? null,
      data_final_contrato: p.data_final_contrato,
    }));

    const ids = processos.map((p) => p.id);
    const { data: etapasRaw, error: erroEtapas } = ids.length
      ? await supabase
          .from("etapas")
          .select("id, nome, data_prevista, processo_id, usuarios ( nome )")
          .in("processo_id", ids)
          .in("status", ["pendente", "em_andamento"])
          .not("data_prevista", "is", null)
          .lte("data_prevista", limiteStr)
      : { data: [], error: null };
    if (erroEtapas) throw new Error(erroEtapas.message);

    const etapas: EtapaResumo[] = (etapasRaw ?? []).map((e) => ({
      id: e.id,
      nome: e.nome,
      data_prevista: e.data_prevista as string,
      processo_id: e.processo_id,
      responsavel: (e.usuarios as { nome: string } | null)?.nome ?? null,
    }));

    const r = montarResumoProcessos(processos, etapas, hoje);

    const html = montarHtmlResumoProcessos(r, hoje);

    await enviarEmail({
      destinatarios: listaDestinatarios,
      assunto: `Resumo dos processos — ${dataBR(hoje)}`,
      html,
    });

    await supabase.from("financeiro_email_envios").insert({
      tenant_id: tenantId,
      tipo: "processos",
      destinatarios: listaDestinatarios,
      sucesso: true,
      resumo: {
        emAndamento: r.processosEmAndamento,
        atrasadas: r.atrasadas.length,
        hoje: r.hoje.length,
        proximos: r.proximos.length,
        prazosContrato: r.prazosContrato.length,
      },
    });

    return { sucesso: true };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await supabase.from("financeiro_email_envios").insert({
      tenant_id: tenantId,
      tipo: "processos",
      destinatarios: listaDestinatarios,
      sucesso: false,
      erro: mensagem,
    });
    return { sucesso: false, erro: mensagem };
  }
}
