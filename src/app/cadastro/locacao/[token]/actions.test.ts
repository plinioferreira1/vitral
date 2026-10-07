import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({ status: "em_preenchimento", update: vi.fn(), delete: vi.fn(), signed: vi.fn(), filtros: [] as string[] }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: string) => { fake.filtros.push(`${key}=${value}`); return chain; },
      neq: () => chain,
      update: fake.update,
      delete: fake.delete,
      maybeSingle: async () => ({ data: table === "fichas_cadastrais_locacao" ? { id: "ficha-a", tenant_id: "tenant-a", status: fake.status, expira_em: "2099-01-01", tipo_locatario: "titular", ficha_principal_id: null } : null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  },
  storage: { from: () => ({ createSignedUrl: fake.signed }) },
}) }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Estes testes exercitam a fronteira de acesso e de conclusão; campos têm testes próprios.
vi.mock("@/lib/ficha-locacao/campos", async (original) => ({ ...await original<object>(), pendencias: () => [], limparDados: (dados: object) => dados }));
import { finalizarFicha, removerDocumento, salvarRascunho, visualizarDocumento } from "./actions";

beforeEach(() => { vi.clearAllMocks(); fake.status = "em_preenchimento"; fake.filtros = []; });
describe("proteções da ficha pública", () => {
  it("não conclui uma ficha sem os documentos exigidos", async () => {
    const r = await finalizarFicha("token-a", { garantia: "Seguro Fiança", consentimento_lgpd: true }, "data:image/png;base64,assinatura");
    expect(r).toMatchObject({ ok: false, etapa: 4 });
    expect(fake.update).not.toHaveBeenCalled();
  });
  it("não abre nem retira documento pertencente a outra ficha", async () => {
    expect(await visualizarDocumento("token-a", "documento-b")).toMatchObject({ ok: false });
    expect(await removerDocumento("token-a", "documento-b")).toMatchObject({ ok: false });
    expect(fake.filtros).toContain("ficha_id=ficha-a");
    expect(fake.signed).not.toHaveBeenCalled();
    expect(fake.delete).not.toHaveBeenCalled();
  });
  it("preserva os dados e anexos de fichas concluídas", async () => {
    fake.status = "concluida";
    expect(await salvarRascunho("token-a", {})).toMatchObject({ ok: false });
    expect(await removerDocumento("token-a", "documento-a")).toMatchObject({ ok: false });
    expect(fake.update).not.toHaveBeenCalled();
    expect(fake.delete).not.toHaveBeenCalled();
  });
});
