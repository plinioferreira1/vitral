/**
 * Espera uma promessa por no máximo `ms`. Se passar do prazo (ou falhar),
 * devolve `reserva`. Usado em partes acessórias da tela (ex.: notificações do
 * cabeçalho), que nunca podem segurar a atualização da página depois de uma
 * gravação.
 */
export async function comPrazo<T>(promessa: PromiseLike<T>, ms: number, reserva: T): Promise<{ valor: T; noPrazo: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<{ valor: T; noPrazo: boolean }>((resolve) => {
    timer = setTimeout(() => resolve({ valor: reserva, noPrazo: false }), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promessa).then((valor) => ({ valor, noPrazo: true })), limite]);
  } catch {
    return { valor: reserva, noPrazo: false };
  } finally {
    clearTimeout(timer);
  }
}
