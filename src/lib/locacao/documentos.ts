/**
 * Documentos dos contratos de locação: tipos, nome padronizado, validação do
 * arquivo, identificação da unidade e busca. Funções puras — o banco
 * (`locacao_documentos`, RLS) e o servidor (`documentos-actions.ts`) aplicam
 * as permissões.
 */

export const BUCKET_DOCUMENTOS_LOCACAO = "locacao-documentos";
export const LIMITE_DOCUMENTO_LOCACAO = 15 * 1024 * 1024;

export const TIPOS_DOCUMENTO = ["contrato", "aditivo", "vistoria", "termo", "seguro_incendio", "outro"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ROTULO_TIPO: Record<TipoDocumento, string> = {
  contrato: "Contrato",
  aditivo: "Aditivo",
  vistoria: "Vistoria",
  termo: "Termo",
  seguro_incendio: "Seguro Incêndio",
  outro: "Outro",
};

const MIME_POR_EXTENSAO: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function tipoDocumento(valor: unknown): TipoDocumento | null {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return (TIPOS_DOCUMENTO as readonly string[]).includes(texto) ? (texto as TipoDocumento) : null;
}

/** Extensão e tipo do arquivo a partir do nome; null se não for PDF ou imagem aceita. */
export function formatoArquivo(nomeArquivo: string): { extensao: string; mime: string } | null {
  const extensao = (nomeArquivo.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const mime = MIME_POR_EXTENSAO[extensao];
  return mime ? { extensao: extensao === "jpeg" ? "jpg" : extensao, mime } : null;
}

export function erroArquivoDocumento(arquivo: { name: string; size: number }): string | null {
  if (!arquivo.size) return "Escolha um arquivo.";
  if (arquivo.size > LIMITE_DOCUMENTO_LOCACAO) return "O arquivo deve ter até 15 MB.";
  if (!formatoArquivo(arquivo.name)) return "Envie um PDF ou uma imagem JPG, PNG ou WebP.";
  return null;
}

/** Os primeiros bytes conferem com o formato declarado (evita arquivo renomeado). */
export function conteudoConfere(bytes: Uint8Array, mime: string): boolean {
  const inicia = (prefixo: number[]) => prefixo.every((b, i) => bytes[i] === b);
  if (mime === "application/pdf") return inicia([37, 80, 68, 70, 45]);
  if (mime === "image/jpeg") return inicia([255, 216, 255]);
  if (mime === "image/png") return inicia([137, 80, 78, 71, 13, 10, 26, 10]);
  if (mime === "image/webp") return inicia([82, 73, 70, 70]) && [87, 69, 66, 80].every((b, i) => bytes[i + 8] === b);
  return false;
}

export function nomeOriginalSeguro(nome: string): string {
  return nome.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200) || "arquivo";
}

export function caminhoDocumento(tenantId: string, contratoId: string, extensao: string, id: string): string {
  return `${tenantId}/${contratoId}/${id}.${extensao}`;
}

export function caminhoValido(caminho: string, tenantId: string, contratoId: string): boolean {
  const partes = caminho.split("/");
  return (
    partes.length === 3 &&
    partes[0] === tenantId &&
    partes[1] === contratoId &&
    /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(partes[2]) &&
    !caminho.includes("..")
  );
}

export type DadosUnidade = {
  endereco?: string | null;
  condominio_nome?: string | null;
  condominio_bloco?: string | null;
  condominio_unidade?: string | null;
};

/** "Residencial X · Bloco B · Unidade 302" — vazio quando não há nada cadastrado. */
export function identificacaoUnidade(c: DadosUnidade): string {
  const limpo = (v?: string | null) => (v ?? "").trim();
  const partes = [
    limpo(c.condominio_nome),
    limpo(c.condominio_bloco) && `Bloco ${limpo(c.condominio_bloco).replace(/^bloco\s+/i, "")}`,
    limpo(c.condominio_unidade) && `Unidade ${limpo(c.condominio_unidade).replace(/^(unidade|apto?\.?|apartamento)\s+/i, "")}`,
  ].filter(Boolean);
  return partes.join(" · ");
}

/** O que falta no cadastro para o documento ficar bem identificado. */
export function pendenciasCadastro(c: DadosUnidade & { possui_condominio?: boolean | null }): string[] {
  const falta: string[] = [];
  const endereco = (c.endereco ?? "").trim();
  if (endereco.length < 8) falta.push("Endereço completo");
  if (c.possui_condominio) {
    if (!(c.condominio_nome ?? "").trim()) falta.push("Nome do condomínio");
    if (!(c.condominio_unidade ?? "").trim()) falta.push("Unidade");
  }
  return falta;
}

function dataBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Nome padronizado: "Aditivo — Contrato 123 — QE 13 Casa 55 — 25/11/2026".
 * O complemento digitado pela pessoa (ex.: "2º aditivo") entra depois do tipo.
 */
export function nomePadronizado(p: { tipo: TipoDocumento; complemento?: string | null; numeroContrato?: string | null; endereco?: string | null; data?: string | null }): string {
  const complemento = (p.complemento ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const partes = [
    complemento ? `${ROTULO_TIPO[p.tipo]} (${complemento})` : ROTULO_TIPO[p.tipo],
    (p.numeroContrato ?? "").trim() && `Contrato ${(p.numeroContrato ?? "").trim()}`,
    (p.endereco ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    p.data && /^\d{4}-\d{2}-\d{2}/.test(p.data) ? dataBR(p.data) : "",
  ].filter(Boolean);
  return partes.join(" — ").slice(0, 200);
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export type DocumentoListado = {
  id: string;
  tipo: TipoDocumento;
  nome: string;
  data_documento: string | null;
  criado_em: string;
  contrato: { id: string; numero: string | null; endereco: string; unidade: string; locatario: string | null };
};

/** Busca sem acento por todas as palavras (nome, contrato, endereço, unidade, locatário) + filtro de tipo. */
export function filtrarDocumentos<T extends DocumentoListado>(lista: T[], busca: string, tipo: TipoDocumento | null): T[] {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  return lista
    .filter((d) => !tipo || d.tipo === tipo)
    .filter((d) => {
      if (!palavras.length) return true;
      const alvo = normalizar(
        [d.nome, ROTULO_TIPO[d.tipo], d.contrato.numero ?? "", d.contrato.endereco, d.contrato.unidade, d.contrato.locatario ?? ""].join(" "),
      );
      return palavras.every((p) => alvo.includes(p));
    })
    .sort((a, b) => (b.data_documento ?? b.criado_em).localeCompare(a.data_documento ?? a.criado_em));
}
