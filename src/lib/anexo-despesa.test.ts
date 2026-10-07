import { describe, expect, it } from "vitest";
import { caminhoAnexoValido, conteudoArquivoValido, erroArquivoDespesa, LIMITE_ANEXO_DESPESA, nomeArquivoDespesa } from "./anexo-despesa";

describe("arquivos de despesas", () => {
  it("aceita PDF e imagens dentro do limite", () => {
    expect(erroArquivoDespesa({ size: LIMITE_ANEXO_DESPESA, type: "application/pdf" })).toBeNull();
    expect(erroArquivoDespesa({ size: 512, type: "image/jpeg" })).toBeNull();
  });
  it("rejeita arquivo vazio, excessivo ou executável", () => {
    expect(erroArquivoDespesa({ size: 0, type: "application/pdf" })).toBeTruthy();
    expect(erroArquivoDespesa({ size: LIMITE_ANEXO_DESPESA + 1, type: "application/pdf" })).toContain("3 MB");
    expect(erroArquivoDespesa({ size: 20, type: "text/html" })).toBeTruthy();
  });
  it("confere o conteúdo e não apenas o tipo informado pelo navegador", () => {
    expect(conteudoArquivoValido(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(conteudoArquivoValido(new TextEncoder().encode("<html>"), "application/pdf")).toBe(false);
    expect(conteudoArquivoValido(new Uint8Array([255, 216, 255]), "image/jpeg")).toBe(true);
    expect(conteudoArquivoValido(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png")).toBe(true);
    expect(conteudoArquivoValido(new TextEncoder().encode("RIFF0000WEBP"), "image/webp")).toBe(true);
    expect(conteudoArquivoValido(new TextEncoder().encode("RIFF0000AVI "), "image/webp")).toBe(false);
  });
  it("limpa caminhos e caracteres de controle do nome apresentado", () => {
    expect(nomeArquivoDespesa("C:\\pasta\\boleto\n.pdf")).toBe("boleto.pdf");
    expect(nomeArquivoDespesa("/pasta/" + "a".repeat(250))).toHaveLength(200);
  });
  it("bloqueia caminho de outra empresa, outra despesa e travessia de pastas", () => {
    expect(caminhoAnexoValido("empresa/despesa/arquivo.pdf", "empresa", "despesa")).toBe(true);
    expect(caminhoAnexoValido("outra/despesa/arquivo.pdf", "empresa", "despesa")).toBe(false);
    expect(caminhoAnexoValido("empresa/outra/arquivo.pdf", "empresa", "despesa")).toBe(false);
    expect(caminhoAnexoValido("empresa/despesa/../arquivo.pdf", "empresa", "despesa")).toBe(false);
  });
});
