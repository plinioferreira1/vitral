import { describe, expect, it } from "vitest";
import { GUIAS_FIXOS } from "./guias";
import { assuntoDe, assuntosComTopicos, buscarTopicos, normalizar, slugTopico, tutorialParaTopico, type Topico } from "./topicos";

const tutorial = {
  id: "abcdef12-3456",
  categoria: "Locação",
  tipo: "video",
  titulo: "Como subir contratos na CredSign",
  descricao: "Envio para assinatura eletrônica",
  conteudo: null,
  link: "https://youtu.be/xyz",
};

describe("central de ajuda", () => {
  it("normaliza acentos e maiúsculas", () => {
    expect(normalizar("Locação ÁGUA")).toBe("locacao agua");
    expect(slugTopico("Glossário: tipos de propriedade")).toBe("glossario-tipos-de-propriedade");
  });

  it("encaixa a categoria digitada num assunto fixo", () => {
    expect(assuntoDe("locacao")).toBe("Locação");
    expect(assuntoDe(" Primeiros passos ")).toBe("Primeiros passos");
    expect(assuntoDe("Marketing")).toBe("Outros");
  });

  it("converte tutorial do banco em tópico com link próprio", () => {
    const t = tutorialParaTopico(tutorial);
    expect(t).toMatchObject({ assunto: "Locação", tipo: "video", slug: "como-subir-contratos-na-credsign-abcdef" });
    expect(tutorialParaTopico({ ...tutorial, tipo: "texto", conteudo: "Passo 1", link: "/guias/x.html" }).corpo).toEqual({
      tipo: "texto",
      texto: "Passo 1",
      link: "/guias/x.html",
    });
  });

  it("busca sem acento, com todas as palavras, título primeiro", () => {
    const todos: Topico[] = [...GUIAS_FIXOS, tutorialParaTopico(tutorial)];
    expect(buscarTopicos(todos, "credsign", null).map((t) => t.titulo)).toEqual([tutorial.titulo]);
    expect(buscarTopicos(todos, "CAPTACAO", null)[0].titulo).toBe("Passo a passo de captação");
    // "habite-se" só aparece dentro do glossário
    expect(buscarTopicos(todos, "habite", null).map((t) => t.slug)).toEqual(["glossario-tipos-de-propriedade"]);
    expect(buscarTopicos(todos, "captação inexistente", null)).toEqual([]);
  });

  it("filtra por assunto e lista só assuntos com conteúdo", () => {
    expect(buscarTopicos(GUIAS_FIXOS, "", "Captação")).toHaveLength(2);
    expect(assuntosComTopicos(GUIAS_FIXOS)).toEqual(["Vendas", "Captação", "Modelos e documentos", "Links úteis"]);
  });

  it("guias fixos têm links próprios únicos", () => {
    const slugs = GUIAS_FIXOS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
