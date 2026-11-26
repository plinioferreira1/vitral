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
