/**
 * Monta um objeto de update só com os campos que têm valor —
 * evita que um campo deixado em branco no formulário apague um
 * dado que a pessoa/imóvel já tinha salvo (ex: escolher um cliente
 * já cadastrado, mas sem preencher o telefone de novo).
 */
export function objetoParcial(pares: Record<string, string | number | null>): Record<string, string | number> {
  const resultado: Record<string, string | number> = {};
  for (const [chave, valor] of Object.entries(pares)) {
    if (valor !== null && valor !== undefined && valor !== "") {
      resultado[chave] = valor;
    }
  }
  return resultado;
}

/** true quando o objeto não tem nenhum campo — sinal de que não vale a pena mandar o update. */
export function objetoVazio(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}
