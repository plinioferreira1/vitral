/**
 * Vínculo automático da ficha de fiador/corresponsável ao titular pelo nome
 * que a pessoa digita. Só vincula quando exatamente um titular combina; com
 * nenhum ou vários, a ficha fica para a equipe conferir.
 */

const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e"]);

export function normalizarNome(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

const palavras = (nome: string) => normalizarNome(nome).split(" ").filter((p) => p && !LIGACOES.has(p));

/**
 * O nome digitado combina com o do titular quando tem ao menos nome e um
 * sobrenome, começa pelo primeiro nome e todas as palavras aparecem no nome
 * do titular, na mesma ordem (ex.: "Maria Souza" combina com "Maria de Fátima Souza").
 */
export function nomeCombina(informado: string, titular: string): boolean {
  const a = palavras(informado);
  const b = palavras(titular);
  if (a.length < 2 || b.length < 2 || a[0] !== b[0]) return false;
  let i = 0;
  for (const p of b) if (p === a[i]) i++;
  return i === a.length;
}

/** Titular único que combina com o nome digitado, ou null. */
export function titularUnico<T extends { nome: string }>(informado: string, titulares: T[]): T | null {
  const achados = titulares.filter((t) => nomeCombina(informado, t.nome));
  return achados.length === 1 ? achados[0] : null;
}

export type FichaExistente = { id: string; token: string; status: string; cpf: string };

/**
 * Fiador (ou corresponsável) que já começou a ficha e volta pelo link público:
 * - mesma pessoa (mesmo CPF) com ficha em andamento → continua de onde parou;
 * - ficha já enviada → avisa que já foi enviada;
 * - mesma vaga ocupada por rascunho sem CPF → o rascunho vazio é substituído;
 * - mesma vaga ocupada por outra pessoa (CPF diferente) → avisa que a vaga está em uso.
 * Sem CPF igual nada é mostrado, então ninguém abre a ficha de outra pessoa só pelo nome do titular.
 */
export function decidirRetomada(
  cpf: string,
  daMesmaPessoa: FichaExistente[],
  daMesmaVaga: FichaExistente | null
): { acao: "continuar"; token: string } | { acao: "enviada" } | { acao: "ocupada" } | { acao: "nova"; substituir: string | null } {
  const so = (v: string) => v.replace(/\D/g, "");
  const minha = daMesmaPessoa.find((f) => so(f.cpf) === so(cpf) && f.status !== "concluida");
  if (minha) return { acao: "continuar", token: minha.token };
  if (daMesmaPessoa.some((f) => so(f.cpf) === so(cpf) && f.status === "concluida")) return { acao: "enviada" };
  if (!daMesmaVaga) return { acao: "nova", substituir: null };
  if (daMesmaVaga.status === "concluida") return { acao: "enviada" };
  if (!so(daMesmaVaga.cpf)) return { acao: "nova", substituir: daMesmaVaga.id };
  return so(daMesmaVaga.cpf) === so(cpf) ? { acao: "continuar", token: daMesmaVaga.token } : { acao: "ocupada" };
}
