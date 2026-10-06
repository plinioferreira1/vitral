import { EM_FINALIZACAO } from "./em-finalizacao";
import type { PermissoesUsuario } from "./permissoes";

export type LinkMenu = { href: string; label: string };
export type SubItemMenu = LinkMenu | { label: string; children: LinkMenu[] };
export type ItemMenu = LinkMenu | { label: string; children: SubItemMenu[] };

export function montarMenu(p: PermissoesUsuario): ItemMenu[] {
  const operacional = !p.ehCorretor && !p.ehSocialMedia;
  // telas em finalização só aparecem para a gestão (diretor/gerente)
  const verAvaliacoes = !EM_FINALIZACAO.avaliacoes || p.podeConfigurar;
  const verDebitos = !EM_FINALIZACAO.debitos || p.podeConfigurar;
  const verTermosEntrega = !EM_FINALIZACAO.termosEntrega || p.podeConfigurar;
  const verFerias = !EM_FINALIZACAO.ferias || p.podeConfigurar;
  const documentos: ItemMenu = {
    label: "Documentos",
    children: [
      { href: "/autorizacoes", label: "Autorizações de venda" },
      { href: "/propostas", label: "Propostas de compra" },
      { href: "/termos-visita", label: "Termos de visita" },
    ],
  };
  const ferramentas: ItemMenu = {
    label: "Ferramentas",
    children: [
      { href: "/calculadora", label: "Cálculo proporcional" },
      { href: "/calculadora-data", label: "Cálculo de datas" },
      { href: "/cartorio", label: "Simulação de custas" },
      ...(!p.ehSocialMedia && verAvaliacoes ? [{ href: "/avaliacoes", label: "Avaliações de imóveis" }] : []),
      ...(operacional && p.temLocacao
        ? [{ href: "/locacao?aba=multa", label: "Cálculo de multa rescisória" }]
        : []),
    ],
  };
  const itens: ItemMenu[] = [{ href: "/", label: "Início" }];
  if (operacional) {
    itens.push({ href: "/calendario", label: "Calendário" });
    if (p.temVenda) itens.push({
      label: "Vendas",
      children: [
        { href: "/vendas?aba=resumo", label: "Visão geral" },
        { href: "/vendas?aba=andamento", label: "Processos de venda" },
        ...(verTermosEntrega ? [{ href: "/vendas/termos-entrega", label: "Termos de entrega de chaves" }] : []),
      ],
    });
    if (p.temFinanciamento) itens.push({
      label: "Financiamentos",
      children: [
        { href: "/financiamentos?aba=resumo", label: "Visão geral" },
        { href: "/financiamentos?aba=andamento", label: "Processos de financiamento" },
        { href: "/financiamentos?aba=processos", label: "Documentos necessários" },
        { href: "/financiamentos?aba=custas", label: "Simulação de custas do financiamento" },
      ],
    });
    if (p.temLocacao) itens.push({
      label: "Locação",
      children: [
        { href: "/locacao?aba=resumo", label: "Visão geral" },
        { href: "/locacao?aba=contratos", label: "Contratos" },
        { href: "/locacao?aba=inadimplencias", label: "Contas da locação" },
        ...(verDebitos ? [{ href: "/locacao/debitos", label: "Controle de débitos" }] : []),
        { href: "/locacao/ficha-cadastral", label: "Fichas cadastrais" },
      ],
    });
  }
  if (!p.ehSocialMedia) itens.push(documentos);
  if (operacional && p.podeConfigurar) itens.push({
    label: "Financeiro",
    children: [
      { href: "/financeiro", label: "Visão geral" },
      { href: "/financeiro/contas-a-pagar", label: "Contas a pagar" },
      { href: "/financeiro/contas-a-receber", label: "Contas a receber" },
      { href: "/financeiro/transferencias", label: "Transferências" },
      { href: "/financeiro/cartao-corporativo", label: "Cartões e faturas" },
      {
        label: "Cadastros financeiros",
        children: [
          { href: "/financeiro/contas-bancarias", label: "Contas bancárias" },
          { href: "/financeiro/pessoas", label: "Pessoas e empresas" },
        ],
      },
    ],
  });
  itens.push(ferramentas);
  if (operacional && p.podeConfigurar) itens.push({
    label: "Relatórios",
    children: [
      { href: "/relatorio-semanal", label: "Resumo semanal" },
      { href: "/financeiro/relatorios", label: "Relatórios financeiros" },
    ],
  });
  if (operacional && verFerias) itens.push({ href: "/ferias", label: "Férias" });
  itens.push({ href: "/corretor", label: "Central de ajuda" });
  if (operacional && p.podeConfigurar) itens.push({
    label: "Configurações",
    children: [
      { href: "/membros", label: "Equipe e permissões" },
      {
        label: "Processos e rotinas",
        children: [
          { href: "/etapas-padrao", label: "Etapas dos processos" },
          { href: "/tarefas-recorrentes", label: "Rotinas de locação" },
          { href: "/checklists-financiamento", label: "Modelos de checklist de financiamento" },
        ],
      },
      {
        label: "Comunicação e integrações",
        children: [
          { href: "/financeiro/configuracoes-email", label: "Resumos por e-mail" },
          { href: "/google-agenda", label: "Integração com Google Agenda" },
        ],
      },
      {
        label: "Financeiro",
        children: [{ href: "/financeiro/categorias", label: "Categorias financeiras" }],
      },
      { href: "/avaliacoes/configuracao", label: "Avaliações de imóveis" },
      { href: "/vendas/termos-entrega/configuracao", label: "Termo de entrega de chaves" },
      {
        label: "Conteúdo e treinamento",
        children: [
          { href: "/onboarding-corretor", label: "Checklist de primeiros passos" },
          { href: "/tutoriais", label: "Gerenciar tutoriais" },
        ],
      },
    ],
  });
  return itens;
}

/** Escolhe o destino mais específico para não marcar dois grupos ao mesmo tempo. */
export function hrefAtivoMenu(itens: ItemMenu[], pathname: string, query: URLSearchParams): string | undefined {
  const parametros = new URLSearchParams(query);
  if (["/vendas", "/financiamentos", "/locacao"].includes(pathname) && !parametros.has("aba")) {
    parametros.set("aba", "resumo");
  }
  const links = itens.flatMap((item) =>
    "href" in item ? [item] : item.children.flatMap((filho) => "href" in filho ? [filho] : filho.children)
  );
  return links
    .filter(({ href }) => {
      const [caminho, params] = href.split("?");
      if (caminho === "/") return pathname === "/";
      if (pathname !== caminho && !pathname.startsWith(caminho + "/")) return false;
      return [...new URLSearchParams(params).entries()].every(([chave, valor]) => parametros.get(chave) === valor);
    })
    .sort((a, b) => b.href.split("?")[0].length - a.href.split("?")[0].length || b.href.length - a.href.length)[0]?.href;
}
