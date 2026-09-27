"use server";

import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

import { createClient } from "@/lib/supabase/server";
import { reconciliarAgendaProcesso, reconciliarAlertaContratoFinal } from "@/lib/google-agenda";

/**
 * Sincroniza um único processo com o Google Agenda (prazos de
 * etapa + alerta de contagem regressiva do contrato). Feito um
 * processo por vez — chamado várias vezes pela tela — pra não
 * estourar o tempo máximo de uma função do servidor quando há
 * muitos processos represados pra sincronizar de uma vez.
 */
export async function sincronizarUmProcesso(processoId: string): Promise<{ ok: boolean }> {
  // Tela de Configurações — só diretor/gerente sincroniza a agenda.
  if (!(await exigirUsuario(GESTORES))) return { ok: false };
  try {
    const supabase = await createClient();
    await reconciliarAgendaProcesso(supabase, processoId);
    await reconciliarAlertaContratoFinal(supabase, processoId);
    return { ok: true };
  } catch (erro) {
    console.error("sincronizarUmProcesso: falha", processoId, erro);
    return { ok: false };
  }
}
