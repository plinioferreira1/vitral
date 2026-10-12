import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validarCorretores } from "./corretores-servidor";

function cliente(resultado: { data: { id: string; nome: string }[] | null; error: object | null }) {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn().mockResolvedValue(resultado) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  return { query, supabase: { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient };
}
describe("validação de corretores antes de salvar", () => {
  it("restringe a consulta à empresa e rejeita um ID ausente mesmo quando enviado como anterior", async () => {
    const { query, supabase } = cliente({ data: [{ id: "amanda", nome: "Amanda" }], error: null });
    expect(await validarCorretores(supabase, "empresa-a", [{ id: "outra-empresa", atual: "outra-empresa" }])).toBeTruthy();
    expect(query.eq).toHaveBeenCalledWith("tenant_id", "empresa-a");
    expect(await validarCorretores(supabase, "empresa-a", [{ id: "amanda" }])).toBeNull();
  });
  it("interrompe a validação em falha de consulta ou de conexão", async () => {
    const { query, supabase } = cliente({ data: null, error: { message: "falha" } });
    expect(await validarCorretores(supabase, "empresa-a", [{ id: null }])).toBeTruthy();
    query.order.mockRejectedValueOnce(new Error("conexão"));
    expect(await validarCorretores(supabase, "empresa-a", [{ id: "amanda" }])).toBeTruthy();
  });
});
