import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { hojeISO } from "@/lib/data-br";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * Monta e envia o relatório financeiro diário de um tenant —
 * saldo consolidado, vencidos e vencendo nos próximos 7 dias.
 * Registra o resultado (sucesso ou erro) em financeiro_email_envios.
 */
export async function enviarRelatorioFinanceiroDiario(tenantId: string) {
  const supabase = createAdminClient();
  const hoje = hojeISO();
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const em7diasStr = em7dias.toISOString().slice(0, 10);

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

    const [{ data: contas }, { data: todasBaixas }, { data: pendentes }] = await Promise.all([
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
        .lte("vencimento", em7diasStr)
        .order("vencimento"),
    ]);

    const saldoInicialTotal = (contas ?? []).reduce((s, c) => s + Number(c.saldo_inicial), 0);
    const movimento = (todasBaixas ?? []).reduce((s, b) => {
      const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } }).financeiro_lancamentos?.tipo;
      return s + (tipo === "receita" ? Number(b.valor) : -Number(b.valor));
    }, 0);
    const saldoConsolidado = saldoInicialTotal + movimento;

    const lista = pendentes ?? [];
    const vencidos = lista.filter((l) => l.vencimento < hoje);
    const proximos = lista.filter((l) => l.vencimento >= hoje);

    const linhaItem = (l: (typeof lista)[number]) => {
      const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
      const cor = l.tipo === "receita" ? "#0f7a4e" : "#b91c1c";
      return `<tr>
        <td style="padding:6px 10px;font-size:13px;color:#44403c;">${dataBR(l.vencimento)}</td>
        <td style="padding:6px 10px;font-size:13px;"><span style="color:${cor};font-weight:600;">${l.tipo === "receita" ? "Receber" : "Pagar"}</span></td>
        <td style="padding:6px 10px;font-size:13px;color:#1c1917;">${l.descricao}${pessoa?.nome ? " — " + pessoa.nome : ""}</td>
        <td style="padding:6px 10px;font-size:13px;color:#1c1917;text-align:right;">${brl(l.valor)}</td>
      </tr>`;
    };

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#731515;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;font-size:18px;margin:0;">Relatório Financeiro Diário</h1>
          <p style="color:#f3d9d9;font-size:13px;margin:4px 0 0;">${dataBR(hoje)} · Sacra Netimóveis</p>
        </div>
        <div style="border:1px solid #e7e5e4;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
          <p style="font-size:13px;color:#78716c;margin:0 0 4px;">Saldo bancário consolidado</p>
          <p style="font-size:28px;font-weight:700;color:#1c1917;margin:0 0 20px;">${brl(saldoConsolidado)}</p>

          <p style="font-size:14px;font-weight:600;color:#b91c1c;margin:0 0 8px;">
            Vencidos (${vencidos.length})
          </p>
          ${
            vencidos.length === 0
              ? `<p style="font-size:13px;color:#78716c;margin:0 0 20px;">Nenhum lançamento vencido. ✅</p>`
              : `<table style="width:100%;border-collapse:collapse;background:#fef2f2;border-radius:8px;margin-bottom:20px;">${vencidos.map(linhaItem).join("")}</table>`
          }

          <p style="font-size:14px;font-weight:600;color:#b45309;margin:0 0 8px;">
            Vencendo nos próximos 7 dias (${proximos.length})
          </p>
          ${
            proximos.length === 0
              ? `<p style="font-size:13px;color:#78716c;margin:0;">Nada vencendo nos próximos 7 dias.</p>`
              : `<table style="width:100%;border-collapse:collapse;background:#fffbeb;border-radius:8px;">${proximos.map(linhaItem).join("")}</table>`
          }

          <p style="font-size:12px;color:#a8a29e;margin-top:24px;">
            Enviado automaticamente pelo Vitral. Para ajustar destinatários ou desativar, acesse
            Financeiro → Configurações de E-mail.
          </p>
        </div>
      </div>
    `;

    await enviarEmail({
      destinatarios: listaDestinatarios,
      assunto: `Relatório Financeiro — ${dataBR(hoje)}`,
      html,
    });

    await supabase.from("financeiro_email_envios").insert({
      tenant_id: tenantId,
      destinatarios: listaDestinatarios,
      sucesso: true,
      resumo: { saldoConsolidado, vencidos: vencidos.length, proximos: proximos.length },
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
