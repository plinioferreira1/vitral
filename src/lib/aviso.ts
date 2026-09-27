import { cookies } from "next/headers";

/**
 * Avisos para a pessoa depois de uma ação (salvar, excluir, etc.).
 *
 * A ação grava o aviso num cookie de vida curta; o layout lê o cookie
 * na renderização seguinte e mostra uma notificação (componente
 * <AvisoTela />), que apaga o cookie assim que aparece. Funciona tanto
 * quando a ação só revalida a página quanto quando ela redireciona.
 */

export const COOKIE_AVISO = "vitral_aviso";

export type Aviso = { id: string; tipo: "sucesso" | "erro"; mensagem: string };

export async function avisar(tipo: Aviso["tipo"], mensagem: string): Promise<void> {
  const aviso: Aviso = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, tipo, mensagem };
  try {
    (await cookies()).set(COOKIE_AVISO, encodeURIComponent(JSON.stringify(aviso)), {
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    });
  } catch {
    // Fora de uma Server Action (ex: renderização) não dá pra gravar
    // cookie — o aviso é só um extra, então não quebra nada.
  }
}

/** Lê o aviso pendente (usado pelo layout). */
export function lerAviso(valor: string | undefined): Aviso | null {
  if (!valor) return null;
  try {
    const aviso = JSON.parse(decodeURIComponent(valor)) as Aviso;
    return aviso?.mensagem ? aviso : null;
  } catch {
    return null;
  }
}

type ErroBanco = { message: string; code?: string } | null;

/** Traduz os erros mais comuns do banco para algo que a pessoa entenda. */
export function traduzirErro(erro: NonNullable<ErroBanco>): string {
  const msg = erro.message ?? "";
  if (erro.code === "23505" || /duplicate key/i.test(msg)) return "já existe um registro com esses dados.";
  if (erro.code === "23503" || /foreign key/i.test(msg))
    return "este registro está ligado a outros dados e não pode ser alterado/excluído assim.";
  if (erro.code === "23502" || /null value/i.test(msg)) return "falta preencher um campo obrigatório.";
  if (erro.code === "42501" || /row-level security|permission denied/i.test(msg))
    return "você não tem permissão para esta ação.";
  if (erro.code === "22P02" || /invalid input syntax/i.test(msg)) return "algum campo tem um valor inválido.";
  if (/fetch failed|network|timeout/i.test(msg)) return "falha de conexão com o banco. Tente de novo.";
  return msg || "erro desconhecido.";
}

/**
 * Executa uma gravação no banco e, se ela falhar, deixa um aviso de erro
 * para a pessoa (antes a falha passava em silêncio: clicava e nada
 * acontecia). Devolve `true` se deu certo. Não muda o fluxo da ação —
 * quem chama decide se continua ou para.
 */
export async function checar(
  operacao: PromiseLike<{ error: ErroBanco }>,
  acao = "salvar"
): Promise<boolean> {
  let erro: ErroBanco;
  try {
    ({ error: erro } = await operacao);
  } catch (e) {
    erro = { message: e instanceof Error ? e.message : String(e) };
  }
  if (!erro) return true;
  console.error(`Falha ao ${acao}:`, erro);
  await avisar("erro", `Não foi possível ${acao}: ${traduzirErro(erro)}`);
  return false;
}
