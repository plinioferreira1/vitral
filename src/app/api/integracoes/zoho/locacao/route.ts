import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZohoListResponse = {
  status?: { code?: number; description?: string };
  data?: unknown[];
};

/**
 * Primeira etapa da integração: leitura ao vivo, sem persistência,
 * sem alteração de status e sem permissões de envio.
 * Disponível apenas para gestores autenticados.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: actor, error: actorError } = await supabase
    .from("usuarios")
    .select("id, perfil, nivel_acesso, ativo, tenant_id")
    .eq("id", user.id)
    .single();

  if (actorError || !actor || !actor.ativo ||
      !(
        actor.perfil === "admin" ||
        actor.perfil === "gerente" ||
        actor.nivel_acesso === "diretor" ||
        actor.nivel_acesso === "gerente"
      )) {
    return NextResponse.json({ error: "Sem permissão para a caixa de Locação" }, { status: 403 });
  }

  const clientId = process.env.ZOHO_LOCACAO_CLIENT_ID || process.env.ZOHO_MAIL_CLIENT_ID;
  const clientSecret = process.env.ZOHO_LOCACAO_CLIENT_SECRET || process.env.ZOHO_MAIL_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_LOCACAO_REFRESH_TOKEN || process.env.ZOHO_MAIL_REFRESH_TOKEN;
  const accountId = process.env.ZOHO_LOCACAO_ACCOUNT_ID || process.env.ZOHO_MAIL_ACCOUNT_ID;
  const configuredFolderId = process.env.ZOHO_LOCACAO_INBOX_FOLDER_ID || process.env.ZOHO_MAIL_INBOX_FOLDER_ID;
  // Ajustar ambos para a região do datacenter da conta Zoho.
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";
  const mailUrl = process.env.ZOHO_MAIL_API_URL || "https://mail.zoho.com";

  if (![clientId, clientSecret, refreshToken, accountId].every(Boolean)) {
    return NextResponse.json(
      { error: "Integração Zoho ainda não configurada no servidor" },
      { status: 503 }
    );
  }

  // Impedir que variáveis de ambiente sejam transformadas em hosts arbitrários.
  const validHost = (input: string, suffix: string) => {
    try {
      const url = new URL(input);
      return url.protocol === "https:" &&
        !url.username && !url.password && !url.port &&
        (url.hostname === suffix || url.hostname.endsWith("." + suffix)) &&
        url.pathname === "/" && !url.search && !url.hash;
    } catch {
      return false;
    }
  };
  if (!validHost(accountsUrl, "zoho.com") || !validHost(mailUrl, "zoho.com")) {
    return NextResponse.json({ error: "Endpoint Zoho inválido" }, { status: 503 });
  }

  const tokenBody = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId!,
    client_secret: clientSecret!,
    refresh_token: refreshToken!,
  });

  try {
    const tokenResponse = await fetch(new URL("/oauth/v2/token", accountsUrl), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const tokenJson = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenJson.access_token) {
      const allowedErrors = new Set(["invalid_client", "invalid_client_secret", "invalid_code", "invalid_grant", "access_denied", "invalid_request"]);
      const code = tokenJson.error && allowedErrors.has(tokenJson.error) ? tokenJson.error : "unknown";
      return NextResponse.json(
        { error: "Falha na autorização Zoho", codigo_zoho: code, http_zoho: tokenResponse.status },
        { status: 502, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const query = new URL(request.url).searchParams;
    const requestedLimit = Number(query.get("limit") || "30");
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.trunc(requestedLimit))) : 30;
    let folderId = configuredFolderId;
    if (!folderId) {
      // Discover the Inbox by name rather than accidentally fetching every folder.
      // This requires a ZohoMail.folders.READ grant on the configured refresh token.
      const foldersUrl = new URL(`/api/accounts/${encodeURIComponent(accountId!)}/folders`, mailUrl);
      const foldersResponse = await fetch(foldersUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${tokenJson.access_token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!foldersResponse.ok) {
        return NextResponse.json({ error: "Não foi possível identificar a pasta de entrada. Configure ZOHO_LOCACAO_INBOX_FOLDER_ID ou autorize ZohoMail.folders.READ." }, { status: 503 });
      }
      const foldersJson = await foldersResponse.json() as { data?: Array<{ folderId?: string; folderName?: string; folderType?: string }> };
      const inbox = foldersJson.data?.find(folder =>
        folder.folderName?.toLowerCase() === "inbox" ||
        folder.folderType?.toLowerCase() === "inbox" ||
        folder.folderName?.toLowerCase() === "entrada"
      );
      folderId = inbox?.folderId;
      if (!folderId) {
        return NextResponse.json({ error: "Pasta de entrada não identificada na conta Zoho." }, { status: 503 });
      }
    }
    const messageId = query.get("messageId");
    if (messageId !== null) {
      if (!/^\d{1,30}$/.test(messageId) || !/^\d{1,30}$/.test(folderId)) {
        return NextResponse.json({ error: "Identificador de e-mail inválido" }, { status: 400 });
      }
      const contentUrl = new URL(
        "/api/accounts/" + encodeURIComponent(accountId!) +
        "/folders/" + encodeURIComponent(folderId) +
        "/messages/" + encodeURIComponent(messageId) + "/content", mailUrl
      );
      const detailResponse = await fetch(contentUrl, {
        headers: { Authorization: "Zoho-oauthtoken " + tokenJson.access_token, Accept: "application/json" },
        cache: "no-store", signal: AbortSignal.timeout(15000)
      });
      if (!detailResponse.ok) return NextResponse.json({ error: "Não foi possível abrir a mensagem" }, { status: 502 });
      const detail = await detailResponse.json() as { data?: { content?: string }; status?: { code?: number } };
      if (!detail.data || (detail.status?.code && detail.status.code !== 200)) {
        return NextResponse.json({ error: "Mensagem não disponível" }, { status: 502 });
      }
      // O conteúdo remoto nunca é injetado como HTML no navegador.
      const plainText = String(detail.data.content || "").slice(0, 400000)
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
        .replace(/<(br|hr)\s*\/?>/gi, "\n")
        .replace(/<\/(?:div|p|li|tr|table|h[1-6]|blockquote)>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/\n{3,}/g, "\n\n").trim().slice(0, 120000);
      return NextResponse.json(
        { messageId, text: plainText, readOnly: true },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
    const inboxUrl = new URL(
      `/api/accounts/${encodeURIComponent(accountId!)}/messages/view`,
      mailUrl
    );
    inboxUrl.searchParams.set("folderId", folderId);
    inboxUrl.searchParams.set("start", "1");
    inboxUrl.searchParams.set("limit", String(limit));
    inboxUrl.searchParams.set("sortBy", "date");
    inboxUrl.searchParams.set("sortorder", "false");

    const mailResponse = await fetch(inboxUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${tokenJson.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!mailResponse.ok) {
      return NextResponse.json({ error: "Falha ao consultar a caixa de entrada Zoho" }, { status: 502 });
    }
    const result = await mailResponse.json() as ZohoListResponse;
    if (!Array.isArray(result.data)) {
      return NextResponse.json({ error: "Resposta inesperada da API Zoho" }, { status: 502 });
    }
    // Anota somente as mensagens cujo código VITRAL pertence ao tenant do usuário.
    // Solicitações para mais de uma unidade não recebem um imóvel arbitrário.
    const emails = result.data as Array<Record<string, unknown>>;
    const codigos = [...new Set(emails.flatMap((m) => {
      const match = String(m.subject ?? "").match(/\[VITRAL:([a-f0-9]{16})\]/i);
      return match ? [match[1].toLowerCase()] : [];
    }))];
    const imoveisPorCodigo = new Map<string, { nome: string; contratoId: string }>();
    if (codigos.length && actor.tenant_id) {
      const { data: solicitacoes } = await supabase.from("debitos_solicitacoes")
        .select("id,codigo_resposta").eq("tenant_id", actor.tenant_id).in("codigo_resposta", codigos);
      const ids = (solicitacoes ?? []).map((s) => s.id);
      if (ids.length) {
        const { data: itens } = await supabase.from("debitos_solicitacao_itens")
          .select("solicitacao_id,contrato_id").in("solicitacao_id", ids);
        const contratosUnicos = [...new Set((itens ?? []).map(i => i.contrato_id).filter((id): id is string => Boolean(id)))];
        if (contratosUnicos.length) {
          const { data: contratos } = await supabase.from("contratos_locacao")
            .select("id,numero,imoveis(endereco)").eq("tenant_id", actor.tenant_id).in("id", contratosUnicos);
          const nomes = new Map((contratos ?? []).map(c => [c.id, {
            nome: (c.imoveis as { endereco: string } | null)?.endereco || "Contrato " + c.numero,
            contratoId: c.id
          }]));
          for (const s of solicitacoes ?? []) {
            const unidades = [...new Set((itens ?? []).filter(i => i.solicitacao_id === s.id).map(i => i.contrato_id).filter((id): id is string => Boolean(id)))];
            if (unidades.length === 1 && s.codigo_resposta && nomes.has(unidades[0]))
              imoveisPorCodigo.set(s.codigo_resposta.toLowerCase(), nomes.get(unidades[0])!);
          }
        }
      }
    }
    const mensagens = emails.map(m => {
      const codigo = String(m.subject ?? "").match(/\[VITRAL:([a-f0-9]{16})\]/i)?.[1]?.toLowerCase();
      const imovel = codigo ? imoveisPorCodigo.get(codigo) : undefined;
      return { ...m, ...(imovel ? { imovel: imovel.nome, contratoId: imovel.contratoId } : {}) };
    });
    return NextResponse.json(
      { messages: mensagens, readOnly: true, receivedFrom: "zoho" },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Serviço Zoho indisponível no momento" }, { status: 502 });
  }
}
