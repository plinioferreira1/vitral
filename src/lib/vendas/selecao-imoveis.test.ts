import { describe, expect, it } from "vitest";
import { foraDoPerfil, lerEntradaSelecao, linksDeBusca, mesmoImovel, portalDoLink, repetidos, termosDaBusca, type Anuncio, type Perfil } from "./selecao-imoveis";

const perfil: Perfil = {
  cliente: "Maria", finalidade: "venda", tipo: "Apartamento", regiao: "Águas Claras",
  precoMax: 900000, quartos: 3, vagas: 2, areaMin: 80, financiamento: true,
};
const anuncio = (id: string, extra: Partial<Anuncio> = {}): Anuncio => ({
  id, link: `https://www.dfimoveis.com.br/imovel/${id}`, titulo: "Apto", endereco: "Rua 37 Norte, Lote 5, Apto 801",
  preco: 850000, condominio: 900, area: 90, quartos: 3, vagas: 2, observacao: "", ...extra,
});

describe("seleção de imóveis — busca", () => {
  it("monta o texto da busca a partir do perfil", () => {
    expect(termosDaBusca(perfil)).toBe("Apartamento 3 quartos 2 vagas 80 m² venda Águas Claras até R$ 900 mil aceita financiamento");
    const aluguel = termosDaBusca({ ...perfil, finalidade: "aluguel", precoMax: 3500, vagas: 1, financiamento: true });
    expect(aluguel).toContain("1 vaga 80 m² aluguel");
    expect(aluguel).toContain("até R$ 3.500");
    expect(aluguel).not.toContain("financiamento");
  });

  it("gera um link de pesquisa por portal, sem acessar o portal", () => {
    const links = linksDeBusca(perfil);
    expect(links.length).toBeGreaterThanOrEqual(5);
    for (const l of links) expect(l.url.startsWith("https://www.google.com/search?q=site%3A")).toBe(true);
    expect(decodeURIComponent(links[0].url)).toContain("site:dfimoveis.com.br Apartamento");
  });

  it("aceita só https de portal conhecido", () => {
    expect(portalDoLink("https://www.zapimoveis.com.br/imovel/x")?.nome).toBe("ZAP Imóveis");
    expect(portalDoLink("https://df.olx.com.br/abc")?.nome).toBe("OLX");
    expect(portalDoLink("http://www.zapimoveis.com.br/x")).toBeNull();
    expect(portalDoLink("https://zapimoveis.com.br.golpe.com/x")).toBeNull();
    expect(portalDoLink("javascript:alert(1)")).toBeNull();
  });
});

describe("seleção de imóveis — repetidos e perfil", () => {
  it("mesmo link (com ou sem www e barra final) é repetido", () => {
    expect(mesmoImovel(anuncio("a"), { ...anuncio("b"), link: "https://dfimoveis.com.br/imovel/a/" })).toBe(true);
  });

  it("mesmo endereço com área e preço próximos é repetido, mesmo em outro portal", () => {
    const zap = anuncio("z", { link: "https://www.zapimoveis.com.br/imovel/9", endereco: "Rua 37 norte lote 05 ap. 801", preco: 860000, area: 91 });
    expect(mesmoImovel(anuncio("a", { endereco: "Rua 37 Norte, Lote 05, Apto 801" }), zap)).toBe(true);
    expect(mesmoImovel(anuncio("a"), { ...zap, preco: 990000 })).toBe(false);
  });

  it("marca os repetidos apontando para o primeiro", () => {
    const lista = [anuncio("a"), anuncio("b", { endereco: "Outro lugar" }), { ...anuncio("c"), link: "https://www.dfimoveis.com.br/imovel/a" }];
    expect([...repetidos(lista)]).toEqual([["c", "a"]]);
  });

  it("aponta o que foge do perfil", () => {
    expect(foraDoPerfil(anuncio("a", { preco: 950000, quartos: 2, area: 70 }), perfil)).toEqual(["acima do valor máximo", "menos quartos", "área menor"]);
    expect(foraDoPerfil(anuncio("a"), perfil)).toEqual([]);
  });
});

describe("seleção de imóveis — entrada do PDF", () => {
  it("exige cliente, ao menos um anúncio e links de portal", () => {
    expect(lerEntradaSelecao({ perfil: { cliente: "" }, anuncios: [anuncio("a")] })).toEqual({ erro: "Informe o nome do cliente." });
    expect(lerEntradaSelecao({ perfil: { cliente: "Maria" }, anuncios: [] })).toEqual({ erro: "Inclua ao menos um anúncio." });
    expect(lerEntradaSelecao({ perfil: { cliente: "Maria" }, anuncios: [{ link: "https://golpe.com/x" }] })).toHaveProperty("erro");
  });

  it("limpa números em formato brasileiro", () => {
    const r = lerEntradaSelecao({ perfil: { cliente: "Maria", precoMax: "900.000" }, anuncios: [{ ...anuncio("a"), preco: "850.000,50" }] });
    expect("erro" in r).toBe(false);
    if (!("erro" in r)) {
      expect(r.perfil.precoMax).toBe(900000);
      expect(r.anuncios[0].preco).toBe(850000.5);
    }
  });
});
