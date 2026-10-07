import { anexosDe, type DadosFicha, type TipoLocatario } from "./campos";

export type DocumentoFicha = { id: string; nome_arquivo: string; tipo: string };
export type ItemChecklist = { tipo: string; arquivos: DocumentoFicha[]; situacao: "anexado" | "pendente" | "nao_aplicavel" | "opcional"; justificativa?: string };
const ALIASES: Record<string, string[]> = {
  "Documento de identidade (CPF e RG)": ["Documento de identidade", "CPF e RG"],
  "Comprovantes de renda — 3 últimos": ["Comprovantes de renda — 3 últimos", "Comprovantes de renda"],
};

/** Conta categorias atendidas, nunca confunde quantidade de arquivos com completude. */
export function checklistDocumentos(tipo: TipoLocatario, garantia: string, dados: DadosFicha, documentos: DocumentoFicha[]): ItemChecklist[] {
  return anexosDe(tipo, garantia, dados).map((categoria) => {
    const arquivos = documentos.filter((d) => d.tipo === categoria || ALIASES[categoria]?.includes(d.tipo));
    const justificativa = categoria === "Imposto de renda e recibo" ? String(dados.ir_nao_aplicavel ?? "").trim() : "";
    return { tipo: categoria, arquivos, situacao: arquivos.length ? "anexado" : categoria === "Outros documentos" ? "opcional" : justificativa ? "nao_aplicavel" : "pendente", ...(justificativa && !arquivos.length ? { justificativa } : {}) };
  });
}

export function documentosPendentes(tipo: TipoLocatario, garantia: string, dados: DadosFicha, documentos: DocumentoFicha[]) {
  return checklistDocumentos(tipo, garantia, dados, documentos).filter((item) => item.situacao === "pendente").map((item) => item.tipo);
}
