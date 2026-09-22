import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoriaProcesso } from "@/lib/types";

// =========================================================
// Integração com o Google Agenda.
//
// Cada categoria de processo (venda, financiamento, locação)
// tem sua própria agenda no Google, já criada e compartilhada
// manualmente com a conta de serviço (só ela tem permissão de
// escrita — ninguém mais precisa autorizar nada).
//
// Autenticamos assinando um JWT com a chave privada da conta
// de serviço (RS256) e trocando por um access token OAuth2,
// sem precisar de nenhuma lib externa do Google.
//
// Tudo aqui é "melhor esforço": se faltar alguma credencial ou
// a chamada ao Google falhar, a ação principal do usuário (ex:
// concluir uma etapa) nunca deve travar por causa disso — só
// registramos o erro no log do servidor.
// =========================================================

const CALENDAR_IDS: Record<CategoriaProcesso, string | undefined> = {
  venda: process.env.GOOGLE_CALENDAR_ID_VENDA?.trim(),
  financiamento: process.env.GOOGLE_CALENDAR_ID_FINANCIAMENTO?.trim(),
  locacao: process.env.GOOGLE_CALENDAR_ID_LOCACAO?.trim(),
  marketing: process.env.GOOGLE_CALENDAR_ID_MARKETING?.trim(),
};

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Diagnóstico das credenciais/config do Google Agenda — usado
 * só pela tela de configuração, pra mostrar exatamente o que
 * está faltando sem expor nenhum segredo.
 */
export async function diagnosticarCredenciaisGoogle(): Promise<{
  emailConfigurado: boolean;
  chaveConfigurada: boolean;
  calendarios: Record<CategoriaProcesso, boolean>;
  tokenOk: boolean;
  detalhe?: string;
}> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const chavePrivada = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const calendarios = {
    venda: !!CALENDAR_IDS.venda,
    financiamento: !!CALENDAR_IDS.financiamento,
    locacao: !!CALENDAR_IDS.locacao,
    marketing: !!CALENDAR_IDS.marketing,
  };

  if (!email || !chavePrivada) {
    return { emailConfigurado: !!email, chaveConfigurada: !!chavePrivada, calendarios, tokenOk: false };
  }

  try {
    const agora = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
      JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/calendar",
        aud: "https://oauth2.googleapis.com/token",
        iat: agora,
        exp: agora + 3600,
      })
    );
    const assinatura = base64url(
      crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), chavePrivada)
    );
    const jwt = `${header}.${claims}.${assinatura}`;

    const resposta = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!resposta.ok) {
      const texto = await resposta.text();
      return {
        emailConfigurado: true,
        chaveConfigurada: true,
        calendarios,
        tokenOk: false,
        detalhe: texto.slice(0, 400),
      };
    }

    return { emailConfigurado: true, chaveConfigurada: true, calendarios, tokenOk: true };
  } catch (erro) {
    return {
      emailConfigurado: true,
      chaveConfigurada: true,
      calendarios,
      tokenOk: false,
      detalhe: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

let tokenCache: { token: string; expiraEm: number } | null = null;

async function obterAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const chavePrivada = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !chavePrivada) return null;

  if (tokenCache && tokenCache.expiraEm > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const agora = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: agora,
      exp: agora + 3600,
    })
  );
  const assinatura = base64url(
    crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), chavePrivada)
  );
  const jwt = `${header}.${claims}.${assinatura}`;

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resposta.ok) {
    console.error("google-agenda: falha ao obter access token", await resposta.text());
    return null;
  }

  const dados = (await resposta.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: dados.access_token, expiraEm: Date.now() + dados.expires_in * 1000 };
  return dados.access_token;
}

async function chamarGoogleCalendar(
  metodo: "POST" | "PUT" | "DELETE",
  agendaId: string,
  caminho: string,
  corpo?: unknown
): Promise<{ ok: boolean; id?: string }> {
  const token = await obterAccessToken();
  if (!token) return { ok: false };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(agendaId)}/events${caminho}`;
  const resposta = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  // 410 (Gone) e 404 na exclusão significam que o evento já não
  // existe no Google — trata como sucesso (é o estado que queremos).
  if (!resposta.ok && !(metodo === "DELETE" && (resposta.status === 410 || resposta.status === 404))) {
    console.error(`google-agenda: erro ${resposta.status} em ${metodo} ${caminho}`, await resposta.text());
    return { ok: false };
  }

  if (metodo === "DELETE") return { ok: true };

  const dados = (await resposta.json()) as { id: string };
  return { ok: true, id: dados.id };
}

interface EtapaParaAgenda {
  id: string;
  nome: string;
  status: string;
  data_prevista: string | null;
  google_event_id: string | null;
}

interface ProcessoParaAgenda {
  categoria: CategoriaProcesso;
  status: string;
  numero_processo: string;
  imovelEndereco: string | null;
}

/**
 * Recalcula, pra todas as etapas de um processo, se cada uma
 * deve ter um evento no Google Agenda — e cria/atualiza/apaga
 * o que for preciso pra refletir o estado atual do banco.
 *
 * Reconciliar (em vez de tentar adivinhar "o que mudou" em cada
 * chamada) evita duplicar essa lógica em cada action que mexe
 * em etapas, e nunca deixa a agenda dessincronizar por algum
 * ponto esquecido.
 */
export async function reconciliarAgendaProcesso(
  supabase: SupabaseClient,
  processoId: string
): Promise<void> {
  try {
    const { data: processoRaw } = await supabase
      .from("processos")
      .select("categoria, status, numero_processo, imoveis ( endereco )")
      .eq("id", processoId)
      .single();
    if (!processoRaw) return;

    const processo = processoRaw as unknown as ProcessoParaAgenda & {
      imoveis: { endereco: string } | null;
    };
    const agendaId = CALENDAR_IDS[processo.categoria];
    if (!agendaId) return; // sem agenda configurada pra essa categoria

    const { data: etapasRaw } = await supabase
      .from("etapas")
      .select("id, nome, status, data_prevista, google_event_id")
      .eq("processo_id", processoId);
    const etapas = (etapasRaw ?? []) as EtapaParaAgenda[];

    const processoAtivo = processo.status !== "cancelado" && processo.status !== "arquivado";
    const identificador = processo.imoveis?.endereco ?? processo.numero_processo;

    for (const etapa of etapas) {
      const devesTerEvento =
        processoAtivo &&
        !!etapa.data_prevista &&
        etapa.status !== "concluida" &&
        etapa.status !== "bloqueada";

      if (!devesTerEvento) {
        if (etapa.google_event_id) {
          await chamarGoogleCalendar("DELETE", agendaId, `/${etapa.google_event_id}`);
          await supabase.from("etapas").update({ google_event_id: null }).eq("id", etapa.id);
        }
        continue;
      }

      const corpoEvento = {
        summary: `${identificador} — ${etapa.nome}`,
        description: `Etapa "${etapa.nome}" do processo ${identificador} (Vitral).`,
        start: { date: etapa.data_prevista },
        end: { date: etapa.data_prevista },
      };

      if (etapa.google_event_id) {
        const resultado = await chamarGoogleCalendar(
          "PUT",
          agendaId,
          `/${etapa.google_event_id}`,
          corpoEvento
        );
        // Se o evento não existe mais no Google (foi apagado por lá),
        // cria de novo do zero.
        if (!resultado.ok) {
          const criado = await chamarGoogleCalendar("POST", agendaId, "", corpoEvento);
          if (criado.ok && criado.id) {
            await supabase.from("etapas").update({ google_event_id: criado.id }).eq("id", etapa.id);
          }
        }
      } else {
        const criado = await chamarGoogleCalendar("POST", agendaId, "", corpoEvento);
        if (criado.ok && criado.id) {
          await supabase.from("etapas").update({ google_event_id: criado.id }).eq("id", etapa.id);
        }
      }
    }
  } catch (erro) {
    console.error("google-agenda: falha ao reconciliar processo", processoId, erro);
  }
}

/**
 * Remove do Google Agenda os eventos das etapas informadas.
 * Usar antes de apagar processos/etapas do banco (depois de
 * apagados, não teríamos mais como saber a categoria/agenda).
 */
export async function removerEventosDeEtapas(
  supabase: SupabaseClient,
  etapaIds: string[]
): Promise<void> {
  if (etapaIds.length === 0) return;
  try {
    const { data: etapasRaw } = await supabase
      .from("etapas")
      .select("google_event_id, processos ( categoria )")
      .in("id", etapaIds)
      .not("google_event_id", "is", null);

    const etapas = (etapasRaw ?? []) as unknown as {
      google_event_id: string;
      processos: { categoria: CategoriaProcesso } | null;
    }[];

    for (const etapa of etapas) {
      const agendaId = etapa.processos ? CALENDAR_IDS[etapa.processos.categoria] : undefined;
      if (!agendaId) continue;
      await chamarGoogleCalendar("DELETE", agendaId, `/${etapa.google_event_id}`);
    }
  } catch (erro) {
    console.error("google-agenda: falha ao remover eventos de etapas apagadas", erro);
  }
}

// ---------------------------------------------------------
// Alerta de contagem regressiva do prazo final do contrato
// ---------------------------------------------------------

const JANELA_DIAS_ALERTA_CONTRATO = 30;

interface AlertaContratoEvento {
  data: string; // yyyy-mm-dd
  event_id: string;
}

function paraDataUTC(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDias(iso: string, dias: number): string {
  const data = paraDataUTC(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return paraISO(data);
}

function diferencaEmDias(deadlineIso: string, dataIso: string): number {
  const ms = paraDataUTC(deadlineIso).getTime() - paraDataUTC(dataIso).getTime();
  return Math.round(ms / 86_400_000);
}

interface ProcessoParaAlertaContrato {
  categoria: CategoriaProcesso;
  status: string;
  numero_processo: string;
  data_final_contrato: string | null;
  google_alerta_contrato: AlertaContratoEvento[] | null;
  imoveis: { endereco: string } | null;
}

/**
 * Recalcula a série de eventos de contagem regressiva (um por
 * dia, dos 30 dias antes do prazo final do contrato até o dia
 * do prazo) pra Vendas e Financiamentos. Chamar sempre que
 * `data_final_contrato` ou o status do processo mudarem.
 */
export async function reconciliarAlertaContratoFinal(
  supabase: SupabaseClient,
  processoId: string
): Promise<void> {
  try {
    const { data: processoRaw } = await supabase
      .from("processos")
      .select("categoria, status, numero_processo, data_final_contrato, google_alerta_contrato, imoveis ( endereco )")
      .eq("id", processoId)
      .single();
    if (!processoRaw) return;

    const processo = processoRaw as unknown as ProcessoParaAlertaContrato;

    // Só faz sentido pra Vendas e Financiamentos — é onde existe
    // "prazo final do contrato" hoje.
    if (processo.categoria !== "venda" && processo.categoria !== "financiamento") return;

    const agendaId = CALENDAR_IDS[processo.categoria];
    if (!agendaId) return;

    const existentes = processo.google_alerta_contrato ?? [];
    const processoAtivo =
      processo.status !== "cancelado" && processo.status !== "arquivado" && processo.status !== "concluido";

    let datasAlvo: string[] = [];
    if (processoAtivo && processo.data_final_contrato) {
      for (let i = JANELA_DIAS_ALERTA_CONTRATO; i >= 0; i--) {
        datasAlvo.push(somarDias(processo.data_final_contrato, -i));
      }
    }
    const alvoSet = new Set(datasAlvo);

    // Apaga do Google os dias que não fazem mais parte da janela
    // (prazo mudou, processo foi concluído/cancelado, etc.).
    const restantes: AlertaContratoEvento[] = [];
    for (const existente of existentes) {
      if (!alvoSet.has(existente.data)) {
        await chamarGoogleCalendar("DELETE", agendaId, `/${existente.event_id}`);
      } else {
        restantes.push(existente);
      }
    }

    // Cria os dias que estão faltando.
    const identificador = processo.imoveis?.endereco ?? processo.numero_processo;
    const jaTem = new Set(restantes.map((e) => e.data));
    for (const data of datasAlvo) {
      if (jaTem.has(data)) continue;

      const dias = diferencaEmDias(processo.data_final_contrato!, data);
      const titulo =
        dias > 0
          ? `⚠️ ${identificador} — Prazo do contrato em ${dias} dia${dias > 1 ? "s" : ""}!`
          : `⚠️ ${identificador} — Prazo do contrato vence hoje!`;

      const criado = await chamarGoogleCalendar("POST", agendaId, "", {
        summary: titulo,
        description: `Prazo final do contrato de ${identificador} (Vitral).`,
        start: { date: data },
        end: { date: somarDias(data, 1) }, // eventos de dia inteiro usam data final exclusiva
        colorId: "11", // vermelho (Tomato)
      });
      if (criado.ok && criado.id) restantes.push({ data, event_id: criado.id });
    }

    await supabase.from("processos").update({ google_alerta_contrato: restantes }).eq("id", processoId);
  } catch (erro) {
    console.error("google-agenda: falha ao reconciliar alerta de contrato", processoId, erro);
  }
}

/**
 * Remove do Google Agenda todos os alertas de contagem
 * regressiva de contrato dos processos informados. Usar antes
 * de apagar esses processos do banco.
 */
export async function removerAlertasContratoDeProcessos(
  supabase: SupabaseClient,
  processoIds: string[]
): Promise<void> {
  if (processoIds.length === 0) return;
  try {
    const { data: processosRaw } = await supabase
      .from("processos")
      .select("categoria, google_alerta_contrato")
      .in("id", processoIds);

    const processos = (processosRaw ?? []) as unknown as {
      categoria: CategoriaProcesso;
      google_alerta_contrato: AlertaContratoEvento[] | null;
    }[];

    for (const processo of processos) {
      const agendaId = CALENDAR_IDS[processo.categoria];
      if (!agendaId) continue;
      for (const evento of processo.google_alerta_contrato ?? []) {
        await chamarGoogleCalendar("DELETE", agendaId, `/${evento.event_id}`);
      }
    }
  } catch (erro) {
    console.error("google-agenda: falha ao remover alertas de contrato de processos apagados", erro);
  }
}
