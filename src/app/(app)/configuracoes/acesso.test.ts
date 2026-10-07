import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ atual: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ getUsuarioAtual: m.atual, GESTORES: ["diretor", "gerente"] }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("sem acesso"); }, usePathname: () => "/configuracoes" }));
import ConfiguracoesPage from "./page";
import FinanceiroLayout from "../financeiro/layout";

beforeEach(() => vi.clearAllMocks());
describe("acesso às telas de gestão redesenhadas", () => {
  it.each(["corretor", "social_media", "auxiliar", "supervisor"])("barra %s antes de renderizar configurações ou financeiro", async (nivel) => {
    m.atual.mockResolvedValue({ user: { id: "conta" }, usuario: { ativo: true, tenant_id: "empresa", nivel_acesso: nivel } });
    await expect(ConfiguracoesPage()).rejects.toThrow("sem acesso");
    await expect(FinanceiroLayout({ children: "conteúdo" })).rejects.toThrow("sem acesso");
  });
  it("barra conta desativada mesmo com nível de diretor", async () => {
    m.atual.mockResolvedValue({ user: { id: "conta" }, usuario: { ativo: false, tenant_id: "empresa", nivel_acesso: "diretor" } });
    await expect(ConfiguracoesPage()).rejects.toThrow("sem acesso");
  });
  it.each(["diretor", "gerente"])("usa o nível atual %s mesmo quando o perfil antigo é corretor", async (nivel) => {
    m.atual.mockResolvedValue({ user: { id: "conta" }, usuario: { ativo: true, tenant_id: "empresa", nivel_acesso: nivel, perfil: "corretor" } });
    expect(await ConfiguracoesPage()).toBeTruthy();
    expect(await FinanceiroLayout({ children: "conteúdo" })).toBeTruthy();
  });
});
