/** Limita a espera da tela. A operação pode ter confirmado: não repetir com um novo ID. */
export async function aguardarTermo<T>(operacao: Promise<T>, ms = 60_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operacao, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("A confirmação demorou mais que o esperado. Confira a lista de termos antes de tentar novamente. Suas alterações continuam nesta tela.")), ms);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
