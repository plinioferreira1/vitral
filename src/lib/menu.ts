import { GRUPOS_CONFIGURACOES } from "./configuracoes-menu";
import { EM_FINALIZACAO } from "./em-finalizacao";
import type { PermissoesUsuario } from "./permissoes";

export type LinkMenu = { href: string; label: string };
export type SubItemMenu = LinkMenu | { label: string; children: LinkMenu[] };
export type ItemMenu = LinkMenu | { label: string; children: SubItemMenu[] };

export function montarMenu(p: PermissoesUsuario): ItemMenu[] {
  const operacional = !p.ehCorretor && !p.ehSocialMedia;
  // telas em finalização só aparecem para a gestão (diretor/gerente)
  const verAvaliacoes = !EM_FINALIZACAO.avaliacoes || p.podeConfigurar || p.ehCorretor;
  // Controle de Débitos já liberado também ao supervisor (nível operacional sem acesso total)
  const ehSupervisor = operacional && !p.nivelComAcessoTotal;
  const verDebitos = !EM_FINALIZACAO.debitos || p.podeConfigurar || ehSupervisor;
  const verTermosEntrega = !EM_FINALIZACAO.termosEntrega || p.podeConfigurar;
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
      ...(operacional && p.temLocacao ? [
        { href: "/locacao/multa-juros", label: "Multa e juros da locação" },
        { href: "/locacao?aba=multa", label: "Multa rescisória" },
      ] : []),
      { href: "/calculadora-data", label: "Cálculo de datas" },
      { href: "/cartorio", label: "Simulação de custas" },
      ...(!p.ehSocialMedia ? [{ href: "/selecao-imoveis", label: "Seleção de imóveis para cliente" }] : []),
      ...(!p.ehSocialMedia && verAvaliacoes ? [{ href: "/avaliacoes", label: "Avaliações de imóveis" }] : []),
    ],
  };
  const itens: ItemMenu[] = [{ href: "/", label: "Início" }, { href: "/demandas", label: "Demandas" }];
  if (p.temPapelCorretor || p.ehCorretor) itens.push({ href: "/minhas-vendas", label: "Minhas vendas" });
  if (operacional) {
    itens.push({ href: "/calendario", label: "Calendário" });
    if (p.podeConfigurar) itens.push({ href: "/painel-sacra", label: "Resultados" });
    if (p.temVenda) itens.push({
      label: "Vendas",
      children: [
        { href: "/vendas?aba=resumo", label: "Visão geral" },
        { href: "/vendas?aba=andamento", label: "Processos de venda" },
        { href: "/vendas/negociacoes", label: "Negociações" },
        ...(p.podeConfigurar ? [{ href: "/vendas/fontes-leads", label: "Fonte de Vendas" }] : []),
        { href: "/certidoes", label: "Certidões" },
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
        ...(verDebitos ? [{ href: "/locacao/debitos", label: "Inadimplências" }] : []),
        { href: "/locacao/documentos", label: "Documentos" },
        { href: "/locacao/ficha-cadastral", label: "Fichas cadastrais" },
        ...(p.podeConfigurar ? [{ href: "/locacao/emails", label: "E-mails da Locação" }] : []),
        ...(p.nivelComAcessoTotal ? [{ href: "/locacao/contratos", label: "Gerar contratos" }] : []),
      ],
    });
  }
  if (!p.ehSocialMedia) itens.push(documentos);
  if (operacional && p.podeConfigurar) itens.push({
    label: "Financeiro",
    children: [
      { href: "/financeiro", label: "Visão geral" },
      { href: "/financeiro/lancamentos", label: "Lançamentos" },
      { href: "/financeiro/contas-e-cartoes", label: "Contas e cartões" },
      { href: "/financeiro/relatorios", label: "Relatórios" },
    ],
  });
  itens.push(ferramentas);
  if (operacional && p.podeConfigurar) itens.push({
    label: "Relatórios",
    children: [
      { href: "/relatorio-semanal", label: "Resumo semanal" },
    ],
  });
  itens.push({ href: "/corretor", label: "Onboarding e Ajuda" });
  if (operacional && p.podeConfigurar) itens.push({
    label: "Configurações",
    children: [
      { href: "/configuracoes", label: "Visão geral" },
      { href: "/dp", label: "Departamento pessoal (interno)" },
      ...(p.ehDiretor ? [{ href: "/desenvolvimento", label: "Central de desenvolvimento" }] : []),
      ...GRUPOS_CONFIGURACOES.flatMap((grupo): SubItemMenu[] => grupo.links.length === 1
        ? grupo.links.map(({ href, label }) => ({ href, label }))
        : [{ label: grupo.titulo, children: grupo.links.map(({ href, label }) => ({ href, label })) }]),
    ],
  });
  return itens;
}

/** Escolhe o destino mais específico para não marcar dois grupos ao mesmo tempo. */
export function hrefAtivoMenu(itens: ItemMenu[], pathname: string, query: URLSearchParams): string | undefined {
  const parametros = new URLSearchParams(query);
  // Rotas internas permanecem acessíveis, mas destacam o grupo enxuto correspondente.
  const aliases: Array<[RegExp, string]> = [
    [/^\/financeiro\/(?:contas-a-pagar|contas-a-receber)(?:\/|$)/, "/financeiro/lancamentos"],
    [/^\/financeiro\/(?:extratos|transferencias|cartao-corporativo|contas-bancarias|pessoas|documentos-pdf)(?:\/|$)/, "/financeiro/contas-e-cartoes"],
    [/^\/(?:dp|ferias)(?:\/|$)/, "/dp"],
  ];
  const urls = itens.flatMap(item => "href" in item ? [item.href] : item.children.flatMap(filho => "href" in filho ? [filho.href] : filho.children.map(neto => neto.href)));
  for (const [regex, destino] of aliases) {
    if (regex.test(pathname) && urls.includes(destino)) return destino;
  }
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
