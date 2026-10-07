export const GRUPOS_CONFIGURACOES = [
  { titulo: "Equipe e acessos", descricao: "Contas, convites e permissões de uso do Vitral.", links: [
    { href: "/membros", label: "Usuários e acessos", descricao: "Gerencie contas, áreas de acesso e vínculos dos corretores." },
  ] },
  { titulo: "Processos e rotinas", descricao: "Modelos que orientam o trabalho diário da equipe.", links: [
    { href: "/etapas-padrao", label: "Etapas dos processos", descricao: "Sequência de etapas de vendas e financiamentos." },
    { href: "/tarefas-recorrentes", label: "Rotinas de locação", descricao: "Tarefas e periodicidades da operação de locação." },
    { href: "/checklists-financiamento", label: "Modelos de checklist de financiamento", descricao: "Itens que precisam ser conferidos em cada financiamento." },
  ] },
  { titulo: "Comunicação e integrações", descricao: "Destinatários dos resumos e conexão com a agenda.", links: [
    { href: "/financeiro/configuracoes-email", label: "Resumos por e-mail", descricao: "Destinatários dos resumos financeiros e dos processos." },
    { href: "/google-agenda", label: "Integração com Google Agenda", descricao: "Conexão e sincronização dos prazos dos processos." },
  ] },
  { titulo: "Financeiro", descricao: "Organização dos lançamentos e centros de resultado.", links: [
    { href: "/financeiro/categorias", label: "Categorias financeiras", descricao: "Categorias de receitas e despesas e centros de resultado." },
  ] },
  { titulo: "Modelos e documentos", descricao: "Dados usados nas avaliações e nos documentos emitidos.", links: [
    { href: "/avaliacoes/configuracao", label: "Avaliações de imóveis", descricao: "Dados e parâmetros para as avaliações comerciais." },
    { href: "/vendas/termos-entrega/configuracao", label: "Termo de entrega de chaves", descricao: "Dados da empresa e modelos do termo." },
  ] },
  { titulo: "Departamento pessoal", descricao: "Listas do cadastro e regras de ponto e férias.", links: [
    { href: "/dp/configuracoes", label: "Configurações de pessoal", descricao: "Empresas, cargos, departamentos, jornadas e regras de férias." },
  ] },
  { titulo: "Conteúdo e treinamento", descricao: "Materiais para orientar quem utiliza o sistema.", links: [
    { href: "/onboarding-corretor", label: "Checklist de primeiros passos", descricao: "Etapas de orientação para os corretores." },
    { href: "/tutoriais", label: "Gerenciar tutoriais", descricao: "Guias e materiais da Central de ajuda." },
  ] },
] as const;

export function filtrarConfiguracoes(busca: string) {
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}\s]/gu, "");
  const termos = normalizar(busca.trim()).split(/\s+/).filter(Boolean);
  return GRUPOS_CONFIGURACOES.map((grupo) => ({ ...grupo, links: grupo.links.filter((link) => {
    const texto = normalizar(`${grupo.titulo} ${link.label} ${link.descricao}`);
    return termos.every((termo) => texto.includes(termo));
  }) })).filter((grupo) => grupo.links.length);
}
