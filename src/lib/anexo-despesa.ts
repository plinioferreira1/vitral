export const BUCKET_DESPESAS = "financeiro-despesas";
export const LIMITE_ANEXO_DESPESA = 3 * 1024 * 1024;
export const TIPOS_ANEXO_DESPESA = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function erroArquivoDespesa(arquivo: { size: number; type: string }): string | null {
  if (!arquivo.size) return "Escolha um arquivo para anexar.";
  if (arquivo.size > LIMITE_ANEXO_DESPESA) return "O arquivo deve ter até 3 MB.";
  if (!TIPOS_ANEXO_DESPESA.includes(arquivo.type)) return "Envie um PDF ou uma imagem JPG, PNG ou WebP.";
  return null;
}

export function conteudoArquivoValido(bytes: Uint8Array, tipo: string): boolean {
  const inicia = (prefixo: number[]) => prefixo.every((byte, i) => bytes[i] === byte);
  if (tipo === "application/pdf") return inicia([37, 80, 68, 70, 45]);
  if (tipo === "image/jpeg") return inicia([255, 216, 255]);
  if (tipo === "image/png") return inicia([137, 80, 78, 71, 13, 10, 26, 10]);
  if (tipo === "image/webp") return inicia([82, 73, 70, 70]) && [87, 69, 66, 80].every((b, i) => bytes[i + 8] === b);
  return false;
}

export function nomeArquivoDespesa(nome: string): string {
  return nome.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "arquivo";
}

export function caminhoAnexoValido(caminho: string, tenantId: string, id: string): boolean {
  return caminho.startsWith(`${tenantId}/${id}/`) && caminho.split("/").length === 3 && !caminho.includes("..");
}
