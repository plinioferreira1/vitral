import { Constants, type Database } from "./database.types";

type Enums = Database["public"]["Enums"];
export type NomeEnum = keyof Enums;

/**
 * Confere se um texto vindo de formulário é um dos valores aceitos pelo
 * banco para aquela lista (ex: tipo de categoria, papel da pessoa,
 * categoria do processo). Devolve o valor tipado, ou `padrao` se o texto
 * não for válido — assim um valor adulterado ou digitado errado nunca
 * chega ao banco.
 */
export function valorDaLista<N extends NomeEnum>(
  lista: N,
  valor: unknown,
  padrao: Enums[N]
): Enums[N];
export function valorDaLista<N extends NomeEnum>(
  lista: N,
  valor: unknown,
  padrao?: null
): Enums[N] | null;
export function valorDaLista<N extends NomeEnum>(
  lista: N,
  valor: unknown,
  padrao: Enums[N] | null = null
): Enums[N] | null {
  const opcoes = Constants.public.Enums[lista] as readonly string[];
  const texto = typeof valor === "string" ? valor.trim() : "";
  return opcoes.includes(texto) ? (texto as Enums[N]) : padrao;
}
