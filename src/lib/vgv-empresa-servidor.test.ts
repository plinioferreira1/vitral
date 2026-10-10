import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
vi.mock("server-only", () => ({}));
import { obterVgvEmpresa } from "./vgv-empresa-servidor";

function cliente(paginas: unknown[]) {
  const range = vi.fn();
  for (const pagina of paginas) range.mockResolvedValueOnce(pagina);
  const eq = vi.fn();
  const query = { select: vi.fn(), eq, gte: vi.fn(), lt: vi.fn(), order: vi.fn(), range };
  for (const metodo of [query.select, eq, query.gte, query.lt, query.order]) metodo.mockReturnValue(query);
  return { supabase: { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient<Database>, query };
}
describe("consulta do VGV", () => {
  it("soma todas as páginas com filtro explícito de empresa, categoria e ano", async () => {
    const venda = (i: number) => ({ id: `${i}`, categoria: "venda", status: "ativo", valor_total: 1, data_criacao: "2026-01-01" });
    const { supabase, query } = cliente([{ data: Array.from({ length: 500 }, (_, i) => venda(i)), error: null }, { data: [venda(500)], error: null }]);
    expect((await obterVgvEmpresa(supabase, "empresa", 2026, [], [])).realizadoCentavos).toBe(501_00);
    expect(query.eq).toHaveBeenCalledWith("tenant_id", "empresa");
    expect(query.eq).toHaveBeenCalledWith("categoria", "venda");
    expect(query.gte).toHaveBeenCalledWith("data_criacao", "2026-01-01");
    expect(query.lt).toHaveBeenCalledWith("data_criacao", "2027-01-01");
    expect(query.range.mock.calls).toEqual([[0, 499], [500, 999]]);
  });
  it("não apresenta um total parcial quando a segunda página falha", async () => {
    const { supabase } = cliente([{ data: Array.from({ length: 500 }, (_, i) => ({ id: `${i}` })), error: null }, { data: null, error: { message: "falha" } }]);
    await expect(obterVgvEmpresa(supabase, "empresa", 2026, [], [])).rejects.toThrow("Não foi possível consultar");
  });
});
