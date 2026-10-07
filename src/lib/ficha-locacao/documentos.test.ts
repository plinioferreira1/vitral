import { describe, it, expect } from "vitest";
import { checklistDocumentos, documentosPendentes } from "./documentos";
import { anexosDe } from "./campos";

const dados = { estado_civil: "Solteiro(a)", tipo_renda: "Assalariado(a)" };
const documentos = anexosDe("titular", "Seguro Fiança", dados).filter((tipo) => tipo !== "Outros documentos").map((tipo, i) => ({ id: String(i), tipo, nome_arquivo: "arquivo.pdf" }));
describe("documentação de locação", () => {
  it("bloqueia ausência de documentos e atende categorias, não o limite de arquivos", () => {
    expect(documentosPendentes("titular", "Seguro Fiança", dados, [])).toContain("Última fatura do cartão de crédito");
    expect(documentosPendentes("titular", "Seguro Fiança", dados, documentos)).toEqual([]);
    const repetidos = Array.from({ length: 10 }, (_, i) => ({ ...documentos[0], id: String(i) }));
    expect(checklistDocumentos("titular", "Seguro Fiança", dados, repetidos).filter((item) => item.situacao === "anexado")).toHaveLength(1);
  });
  it("aceita categorias antigas e registra a justificativa de IR não aplicável", () => {
    const legados = documentos.map((d) => ({ ...d, tipo: d.tipo.startsWith("Documento de identidade") ? "Documento de identidade" : d.tipo }));
    expect(documentosPendentes("titular", "Seguro Fiança", dados, legados)).toEqual([]);
    const semIr = documentos.filter((d) => d.tipo !== "Imposto de renda e recibo");
    expect(documentosPendentes("titular", "Seguro Fiança", dados, semIr)).toEqual(["Imposto de renda e recibo"]);
    const comJustificativa = { ...dados, ir_nao_aplicavel: "Não apresento declaração de IR." };
    expect(documentosPendentes("titular", "Seguro Fiança", comJustificativa, semIr)).toEqual([]);
    expect(checklistDocumentos("titular", "Seguro Fiança", comJustificativa, semIr).find((d) => d.tipo === "Imposto de renda e recibo")?.situacao).toBe("nao_aplicavel");
  });
  it("adapta a renda, o cônjuge e o imóvel de garantia sem duplicar exigências", () => {
    expect(anexosDe("titular", "Título de Capitalização", dados)).not.toContain("Comprovantes de renda — 3 últimos");
    expect(anexosDe("fiador", "Fiador", { ...dados, imovel_proprio: "Não" })).not.toContain("Escritura e certidão de ônus do imóvel");
    expect(anexosDe("fiador", "Fiador", { ...dados, imovel_proprio: "Sim — quitado" })).toContain("Escritura e certidão de ônus do imóvel");
  });
});
