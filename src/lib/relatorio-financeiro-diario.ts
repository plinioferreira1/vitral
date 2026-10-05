import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { hojeISO } from "@/lib/data-br";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

type LancamentoEmail = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  financeiro_pessoas: { nome: string } | null;
};

function cardResumo(rotulo: string, valor: string, cor = "#1c1917", fundo = "#ffffff") {
  return `
    <td style="width:33.33%;padding:0 6px 12px 6px;">
      <div style="background:${fundo};border:1px solid #e7e2dc;border-radius:14px;padding:14px 16px;">
        <div style="font-size:11px;line-height:16px;color:#78716c;text-transform:uppercase;letter-spacing:.05em;">${rotulo}</div>
        <div style="margin-top:6px;font-size:20px;line-height:26px;font-weight:700;color:${cor};">${valor}</div>
      </div>
    </td>
  `;
}

function tabelaLancamentos(titulo: string, itens: LancamentoEmail[], cor: string, vazio: string) {
  const linhas = itens
    .slice(0, 8)
    .map((l) => {
      const pessoa = l.financeiro_pessoas?.nome;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee9e3;color:#78716c;font-size:12px;white-space:nowrap;">${dataBR(l.vencimento)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #eee9e3;">
            <div style="font-size:13px;line-height:18px;color:#1c1917;font-weight:700;">${escapar(l.descricao)}</div>
            <div style="font-size:12px;line-height:16px;color:#78716c;">${pessoa ? escapar(pessoa) : "Sem pessoa vinculada"}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee9e3;color:${cor};font-size:13px;font-weight:700;text-align:right;white-space:nowrap;">${brl(l.valor)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="background:#ffffff;border:1px solid #e7e2dc;border-radius:16px;padding:18px;margin-top:14px;">
      <div style="font-size:15px;line-height:20px;font-weight:800;color:#1c1917;">${titulo}</div>
      ${
        itens.length === 0
          ? `<div style="margin-top:12px;border-radius:12px;background:#f8f6f3;padding:16px;color:#78716c;font-size:13px;">${vazio}</div>`
          : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:8px;border-collapse:collapse;">${linhas}</table>`
      }
      ${
        itens.length > 8
          ? `<div style="padding-top:10px;color:#78716c;font-size:12px;">+ ${itens.length - 8} outros lançamentos no Vitral.</div>`
          : ""
      }
    </div>
  `;
}

/**
 * Monta e envia o relatório financeiro diário de um tenant.
 * Registra o resultado em financeiro_email_envios.
 */
export async function enviarRelatorioFinanceiroDiario(tenantId: string) {
  const supabase = createAdminClient();
  const hoje = hojeISO();

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

    const [{ data: contas }, { data: todasBaixas }, { data: pendentes }, { data: baixasHoje }, { data: semCategoria }] =
      await Promise.all([
        supabase.from("financeiro_contas_bancarias").select("saldo_inicial").eq("tenant_id", tenantId).eq("ativa", true),
        supabase
          .from("financeiro_baixas")
          .select("valor, financeiro_lancamentos!inner ( tipo, tenant_id )")
          .eq("financeiro_lancamentos.tenant_id", tenantId),
        supabase
          .from("financeiro_lancamentos")
          .select("id, tipo, descricao, valor, vencimento, financeiro_pessoas ( nome )")
          .eq("tenant_id", tenantId)
          .in("status", ["pendente", "pago_parcial"])
          .lte("vencimento", hoje)
          .order("vencimento"),
        supabase
          .from("financeiro_baixas")
          .select("valor, financeiro_lancamentos!inner ( tipo, tenant_id )")
          .eq("financeiro_lancamentos.tenant_id", tenantId)
          .eq("data", hoje),
        supabase
          .from("financeiro_lancamentos")
          .select("id")
          .eq("tenant_id", tenantId)
          .is("categoria_id", null)
          .in("status", ["pago", "pago_parcial"]),
      ]);

    const saldoInicialTotal = (contas ?? []).reduce((s, c) => s + Number(c.saldo_inicial), 0);
    const movimento = (todasBaixas ?? []).reduce((s, b) => {
      const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } }).financeiro_lancamentos?.tipo;
      return s + (tipo === "receita" ? Number(b.valor) : -Number(b.valor));
    }, 0);
    const saldoConsolidado = saldoInicialTotal + movimento;

    const recebidoHoje = (baixasHoje ?? []).reduce((s, b) => {
      const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } }).financeiro_lancamentos?.tipo;
      return tipo === "receita" ? s + Number(b.valor) : s;
    }, 0);
    const pagoHoje = (baixasHoje ?? []).reduce((s, b) => {
      const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } }).financeiro_lancamentos?.tipo;
      return tipo === "despesa" ? s + Number(b.valor) : s;
    }, 0);

    const lista = (pendentes ?? []) as unknown as LancamentoEmail[];
    const vencidos = lista.filter((l) => l.vencimento < hoje);
    const vencemHoje = lista.filter((l) => l.vencimento === hoje);
    const totalVencidos = vencidos.reduce((s, l) => s + Number(l.valor), 0);
    const totalVencemHoje = vencemHoje.reduce((s, l) => s + Number(l.valor), 0);

    const html = `
      <div style="margin:0;padding:0;background:#f4f0ea;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f0ea;">
          <tr>
            <td align="center" style="padding:28px 14px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:760px;border-collapse:collapse;">
                <tr>
                  <td style="background:#731515;border-radius:22px 22px 0 0;padding:26px 28px;">
                    <div style="font-size:12px;line-height:16px;color:#f5d7d7;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">Vitral Financeiro</div>
                    <div style="margin-top:8px;font-size:28px;line-height:34px;color:#ffffff;font-weight:800;">Resumo diário</div>
                    <div style="margin-top:6px;font-size:14px;line-height:20px;color:#f8e9e9;">${dataBR(hoje)} · Sacra Netimóveis</div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#fffaf4;border:1px solid #e7e2dc;border-top:0;border-radius:0 0 22px 22px;padding:22px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        ${cardResumo("Saldo consolidado", brl(saldoConsolidado))}
                        ${cardResumo("Recebido hoje", brl(recebidoHoje), "#047857", "#f0fdf4")}
                        ${cardResumo("Pago hoje", brl(pagoHoje), "#b91c1c", "#fff1f2")}
                      </tr>
                    </table>

                    <div style="background:#ffffff;border:1px solid #e7e2dc;border-radius:16px;padding:18px;">
                      <div style="font-size:13px;color:#78716c;">Pontos de atenção</div>
                      <div style="margin-top:10px;font-size:14px;line-height:22px;color:#1c1917;">
                        <strong style="color:#b91c1c;">${vencidos.length}</strong> vencidos somando <strong>${brl(totalVencidos)}</strong><br/>
                        <strong style="color:#b45309;">${vencemHoje.length}</strong> vencendo hoje somando <strong>${brl(totalVencemHoje)}</strong><br/>
                        <strong style="color:#731515;">${(semCategoria ?? []).length}</strong> recebimentos/baixas ainda sem categoria
                      </div>
                    </div>

                    ${tabelaLancamentos("Vencidos", vencidos, "#b91c1c", "Nenhum lançamento vencido.")}
                    ${tabelaLancamentos("Vencem hoje", vencemHoje, "#b45309", "Nenhum lançamento vencendo hoje.")}

                    <div style="margin-top:18px;padding:16px;border-radius:16px;background:#f8f6f3;color:#78716c;font-size:12px;line-height:18px;">
                      Este e-mail é enviado automaticamente pelo Vitral. Para ajustar destinatários ou enviar um teste,
                      acesse Financeiro → E-mails no sistema.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    await enviarEmail({
      destinatarios: listaDestinatarios,
      assunto: `Resumo financeiro: ${dataBR(hoje)}`,
      html,
    });

    await supabase.from("financeiro_email_envios").insert({
      tenant_id: tenantId,
      destinatarios: listaDestinatarios,
      sucesso: true,
      resumo: {
        saldoConsolidado,
        recebidoHoje,
        pagoHoje,
        vencidos: vencidos.length,
        vencemHoje: vencemHoje.length,
        semCategoria: (semCategoria ?? []).length,
      },
    });

    return { sucesso: true };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await supabase.from("financeiro_email_envios").insert({
      tenant_id: tenantId,
      destinatarios: listaDestinatarios,
      sucesso: false,
      erro: mensagem,
    });
    return { sucesso: false, erro: mensagem };
  }
}
