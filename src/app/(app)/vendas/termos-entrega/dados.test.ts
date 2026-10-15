import { expect, it } from "vitest";
import { carregarModelo, carregarTermo } from "./dados";

function clienteComFalha(tabelaComFalha: string) {
  return { from(tabela: string) {
    const resposta = { data: null, error: tabela === tabelaComFalha ? { message: "conexão" } : null };
    const consulta = { select: () => consulta, eq: () => consulta, order: () => consulta, limit: () => consulta, maybeSingle: () => Promise.resolve(resposta), then: (resolve: (r: typeof resposta) => unknown) => Promise.resolve(resposta).then(resolve) };
    return consulta;
  } } as unknown as Parameters<typeof carregarTermo>[0];
}
it("não substitui modelo indisponível pelo modelo padrão", async () => {
  await expect(carregarModelo(clienteComFalha("termo_entrega_config"), "empresa")).rejects.toThrow("carregar o modelo");
});
it("não converte falha de leitura de partes ou encargos em listas vazias", async () => {
  for (const tabela of ["termo_entrega_partes", "termo_entrega_encargos", "termo_entrega_versoes"]) {
    await expect(carregarTermo(clienteComFalha(tabela), "00000000-0000-4000-8000-000000000003", "empresa")).rejects.toThrow("todos os dados");
  }
});
