type Corretor = { id: string; nome: string };

const EQUIPE = [
  { nome: "Amanda Martins", legado: "Amanda" },
  { nome: "Ricardo Martins", legado: "Ricardo" },
  { nome: "Camila Louzeiro", legado: "Camila" },
  { nome: "Michele Maciel", legado: "Michele" },
  { nome: "Plínio Ferreira", legado: "Plinio" },
];

function normalizar(nome: string) {
  return nome.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

// Apenas opções de comissão. Não altera cadastros, permissões ou vínculos de usuários.
export function corretoresComissao(corretores: Corretor[], selecionado?: string | null) {
  return EQUIPE.flatMap(({ nome, legado }) => {
    const candidatos = corretores.filter(c => [normalizar(nome), normalizar(legado)].includes(normalizar(c.nome)));
    const corretor = candidatos.find(c => c.id === selecionado)
      ?? candidatos.find(c => normalizar(c.nome) === normalizar(nome))
      ?? [...candidatos].sort((a, b) => a.id.localeCompare(b.id))[0];
    return corretor ? [{ id: corretor.id, nome }] : [];
  });
}
