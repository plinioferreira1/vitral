export type RespostaTermo = { ok: boolean; id?: string; erro?: string; atualizadoEm?: string; destino?: string };

/** Sem Server Action no cliente: não aciona a troca de metadados/RSC após gravar. */
export async function enviarTermo(dados: FormData): Promise<RespostaTermo> {
  try {
    const resposta = await fetch("/vendas/termos-entrega/comandos", {
      method: "POST", body: dados, headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000),
    });
    if (!resposta.headers.get("content-type")?.includes("application/json")) throw new Error("Resposta inválida");
    const resultado = await resposta.json() as RespostaTermo;
    if (typeof resultado.ok !== "boolean" || (!resposta.ok && resultado.ok)) throw new Error("Resposta inválida");
    return resultado;
  } catch {
    return { ok: false, erro: "Não foi possível receber a confirmação. Confira a lista de termos antes de repetir. Suas alterações continuam nesta tela." };
  }
}
