import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { obterPrioridadesFinanceiras } from "./prioridades-inicio";

function banco(resultados: { count: number | null; error: unknown }[]) {
  const consultas: { eq: unknown[][]; lt: unknown[][]; select: unknown[][]; status: unknown[][] }[] = [];
  const client = { from: vi.fn(() => {
    const i = consultas.length;
    const registro = { eq: [] as unknown[][], lt: [] as unknown[][], select: [] as unknown[][], status: [] as unknown[][] };
    consultas.push(registro);
    const query = {
      select: (...args: unknown[]) => { registro.select.push(args); return query; },
      eq: (...args: unknown[]) => { registro.eq.push(args); return query; },
      lt: (...args: unknown[]) => { registro.lt.push(args); return query; },
      in: (...args: unknown[]) => { registro.status.push(args); return query; },
      then: (resolve: (valor: unknown) => unknown) => Promise.resolve(resultados[i]).then(resolve),
    };
    return query;
  }) };
  return { client: client as unknown as SupabaseClient<Database>, consultas };
}

describe("prioridades financeiras no início", () => {
  it("usa contagens exatas por empresa, incluindo pagamentos parciais, sem baixar milhares de linhas", async () => {
    const { client, consultas } = banco([1500, 4, 23, 7].map((count) => ({ count, error: null })));
    const resultado = await obterPrioridadesFinanceiras(client, "empresa", "2026-10-07");
    expect(resultado.error).toBe(false);
    expect(resultado.data.map((i) => i.quantidade)).toEqual([1500, 4, 23, 7]);
    for (const q of consultas) {
      expect(q.select).toEqual([["id", { count: "exact", head: true }]]);
      expect(q.eq).toContainEqual(["tenant_id", "empresa"]);
      expect(q.status).toEqual([["status", ["pendente", "pago_parcial"]]]);
    }
    expect(consultas[0].eq).toContainEqual(["vencimento", "2026-10-07"]);
    expect(consultas[2].lt).toEqual([["vencimento", "2026-10-07"]]);
    expect(resultado.data[0].href).toContain("referencia=hoje&status=em_aberto");
    expect(resultado.data[2].href).toContain("referencia=todos&status=vencido");
  });
  it("sinaliza falha de consulta sem apresentar ausência de pendências como sucesso", async () => {
    const { client } = banco([{ count: null, error: { message: "offline" } }, ...[0, 0, 0].map((count) => ({ count, error: null }))]);
    expect((await obterPrioridadesFinanceiras(client, "empresa", "2026-10-07")).error).toBe(true);
  });
});
