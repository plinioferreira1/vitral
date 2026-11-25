import { describe, expect, it } from "vitest";
import {
  caminhoDocumento,
  caminhoValido,
  conteudoConfere,
  erroArquivoDocumento,
  filtrarDocumentos,
  formatoArquivo,
  identificacaoUnidade,
  nomeOriginalSeguro,
  nomePadronizado,
  pendenciasCadastro,
  tipoDocumento,
  type DocumentoListado,
} from "./documentos";

const T = "11111111-1111-4111-8111-111111111111";
const C = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";

describe("documentos da locação — arquivo", () => {
  it("aceita só PDF e imagens até 15 MB", () => {
    expect(formatoArquivo("Contrato.PDF")).toEqual({ extensao: "pdf", mime: "application/pdf" });
    expect(formatoArquivo("foto.jpeg")).toEqual({ extensao: "jpg", mime: "image/jpeg" });
    expect(formatoArquivo("planilha.xlsx")).toBeNull();
    expect(erroArquivoDocumento({ name: "a.pdf", size: 0 })).toMatch(/Escolha/);
    expect(erroArquivoDocumento({ name: "a.pdf", size: 16 * 1024 * 1024 })).toMatch(/15 MB/);
    expect(erroArquivoDocumento({ name: "a.docx", size: 10 })).toMatch(/PDF/);
    expect(erroArquivoDocumento({ name: "a.pdf", size: 10 })).toBeNull();
  });

  it("confere a assinatura do conteúdo", () => {
    expect(conteudoConfere(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(conteudoConfere(new TextEncoder().encode("<html>"), "application/pdf")).toBe(false);
    expect(conteudoConfere(new Uint8Array([255, 216, 255, 224]), "image/jpeg")).toBe(true);
  });

  it("caminho fica preso à empresa e ao contrato", () => {
    const caminho = caminhoDocumento(T, C, "pdf", ID);
    expect(caminho).toBe(`${T}/${C}/${ID}.pdf`);
    expect(caminhoValido(caminho, T, C)).toBe(true);
    expect(caminhoValido(caminho, T, ID)).toBe(false);
    expect(caminhoValido(`${T}/${C}/../${ID}.pdf`, T, C)).toBe(false);
    expect(caminhoValido(`${T}/${C}/${ID}.exe`, T, C)).toBe(false);
    expect(nomeOriginalSeguro("C:\\pasta\\vistoria\u0000.pdf")).toBe("vistoria.pdf");
  });
});

describe("documentos da locação — nomes e cadastro", () => {
  it("monta o nome padronizado", () => {
    expect(nomePadronizado({ tipo: "aditivo", complemento: " 2º  aditivo ", numeroContrato: "123", endereco: "QE 13 Casa 55, Guará II", data: "2026-11-25" }))
      .toBe("Aditivo (2º aditivo) — Contrato 123 — QE 13 Casa 55, Guará II — 25/11/2026");
    expect(nomePadronizado({ tipo: "seguro_incendio" })).toBe("Seguro Incêndio");
  });

  it("identifica condomínio, bloco e unidade sem repetir prefixos", () => {
    expect(identificacaoUnidade({ condominio_nome: "Residencial Duetto", condominio_bloco: "Bloco A", condominio_unidade: "Apto 1402" }))
      .toBe("Residencial Duetto · Bloco A · Unidade 1402");
    expect(identificacaoUnidade({})).toBe("");
  });

  it("aponta o que falta no cadastro", () => {
    expect(pendenciasCadastro({ endereco: "QE 13", possui_condominio: true })).toEqual(["Endereço completo", "Nome do condomínio", "Unidade"]);
    expect(pendenciasCadastro({ endereco: "QE 13 Casa 55, Guará II", possui_condominio: false })).toEqual([]);
  });

  it("valida o tipo vindo do formulário", () => {
    expect(tipoDocumento("vistoria")).toBe("vistoria");
    expect(tipoDocumento("boleto")).toBeNull();
  });
});

describe("documentos da locação — busca", () => {
  const doc = (id: string, tipo: DocumentoListado["tipo"], nome: string, data: string | null, extra: Partial<DocumentoListado["contrato"]> = {}): DocumentoListado => ({
    id, tipo, nome, data_documento: data, criado_em: "2026-01-01T00:00:00Z",
    contrato: { id: C, numero: "10", endereco: "SQN 210 Bloco B", unidade: "Residencial Águas · Unidade 302", locatario: "Lorena Cunha", ...extra },
  });
  const lista = [
    doc("1", "contrato", "Contrato — Contrato 10", "2026-01-10"),
    doc("2", "vistoria", "Vistoria — Contrato 10", "2026-02-10"),
    doc("3", "aditivo", "Aditivo — Contrato 20", "2026-03-10", { numero: "20", endereco: "QE 13 Casa 55", unidade: "", locatario: "Pedro" }),
  ];

  it("busca sem acento e com todas as palavras, mais recentes primeiro", () => {
    expect(filtrarDocumentos(lista, "aguas 302", null).map((d) => d.id)).toEqual(["2", "1"]);
    expect(filtrarDocumentos(lista, "LORENA vistoria", null).map((d) => d.id)).toEqual(["2"]);
    expect(filtrarDocumentos(lista, "", "aditivo").map((d) => d.id)).toEqual(["3"]);
    expect(filtrarDocumentos(lista, "inexistente", null)).toEqual([]);
  });
});
