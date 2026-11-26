import { describe, expect, it } from "vitest";
import { assuntoEmailAssinatura, emailAssinaturaTermo, primeiroNome } from "./email-assinatura";

describe("e-mail de assinatura do termo de entrega", () => {
  it("usa o primeiro nome com só a inicial maiúscula", () => {
    expect(primeiroNome("MARK ANTHONY SILVA")).toBe("Mark");
    expect(primeiroNome("ângela souza")).toBe("Ângela");
    expect(primeiroNome("  ")).toBe("");
  });

  it("põe o endereço no assunto em vez do código", () => {
    expect(assuntoEmailAssinatura("Apartamento nº 2303, Via Majestic, Águas Claras", "TEC-2026-0009")).toBe(
      "Termo de Entrega de Chaves para assinatura – Apartamento nº 2303, Via Majestic, Águas Claras",
    );
    expect(assuntoEmailAssinatura(null, "TEC-2026-0009")).toBe("Termo de Entrega de Chaves para assinatura – TEC-2026-0009");
    expect(assuntoEmailAssinatura("x".repeat(120), "C").length).toBeLessThan(140);
  });

  it("monta HTML com a marca, o imóvel, o botão e o link, sem o código interno", () => {
    const e = emailAssinaturaTermo({ nome: "MARK SILVA", papel: "comprador", endereco: "Rua 28 Norte, Lote 02 <b>", codigo: "TEC-2026-0009", link: "https://vitral.sacraimoveis.com.br/assinar-termo/abc" });
    expect(e.html).toContain("sacra-logo-horizontal-bordo.png");
    expect(e.html).toContain("Conferir e assinar o termo");
    expect(e.html).toContain("https://vitral.sacraimoveis.com.br/assinar-termo/abc");
    expect(e.html).toContain("Comprador(a)");
    expect(e.html).toContain("&lt;b&gt;");
    expect(e.html).not.toContain("TEC-2026-0009");
    expect(e.html).not.toContain(">VITRAL<");
    expect(e.texto.startsWith("Olá, Mark.")).toBe(true);
  });
});

describe("aviso depois de enviar para assinatura", async () => {
  const { avisoEnvioAssinatura } = await import("./email-assinatura");
  it("resume enviados, sem e-mail e falhas", () => {
    expect(avisoEnvioAssinatura({ enviados: ["Mark", "Ana"], semEmail: [], falhas: [] })).toEqual({ tipo: "sucesso", texto: "E-mail com o link enviado para Mark, Ana." });
    const misto = avisoEnvioAssinatura({ enviados: ["Mark"], semEmail: ["João"], falhas: ["Ana"] });
    expect(misto.tipo).toBe("sucesso");
    expect(misto.texto).toContain("Sem e-mail no termo: João");
    expect(misto.texto).toContain("Não foi possível enviar para Ana");
    expect(avisoEnvioAssinatura({ enviados: [], semEmail: [], falhas: ["Ana"] }).tipo).toBe("erro");
    expect(avisoEnvioAssinatura({ enviados: [], semEmail: [], falhas: [] }).texto).toBe("Links de assinatura criados.");
  });
});
