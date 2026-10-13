/* Dados fictícios do laboratório. Nenhum nome, endereço ou valor é real. */
import type { Area, Situacao } from "./ui";

export const HOJE = "2026-10-13";

export type Pessoa = { nome: string; papel: string };
export const EQUIPE: Pessoa[] = [
  { nome: "Helena Duarte Vasconcelos", papel: "Gerente" },
  { nome: "Rafael Moura", papel: "Supervisor de vendas" },
  { nome: "Bianca Teles", papel: "Financiamentos" },
  { nome: "Otávio Lins", papel: "Locação" },
  { nome: "Marina Albuquerque de Sá Figueiredo", papel: "Corretora" },
  { nome: "Caio Nogueira", papel: "Corretor" },
];

export type Prioridade = {
  id: string; area: Area; titulo: string; contexto: string; quando: string; situacao: Situacao; dias: number; responsavel: string; acao: string;
};
export const PRIORIDADES: Prioridade[] = [
  { id: "p1", area: "venda", titulo: "Escritura + intermediária", contexto: "SQN 312 Bloco K apto 504 · Venda 2026/031", quando: "Venceu há 3 dias", situacao: "atrasado", dias: -3, responsavel: "Rafael Moura", acao: "Registrar data da escritura" },
  { id: "p2", area: "financiamento", titulo: "Reanálise da proposta", contexto: "Residencial Parque das Águas, torre 2, apto 1.107 · Caixa", quando: "Venceu ontem", situacao: "atrasado", dias: -1, responsavel: "Bianca Teles", acao: "Cobrar retorno do banco" },
  { id: "p3", area: "locacao", titulo: "IPTU/TLP de outubro em aberto", contexto: "CLN 205 Bloco B loja 12 · contrato 2024/018", quando: "Vence hoje", situacao: "hoje", dias: 0, responsavel: "Otávio Lins", acao: "Conferir débito" },
  { id: "p4", area: "venda", titulo: "Pagamento do sinal", contexto: "Casa no Park Way, Quadra 26, Conjunto 4, Lote 7", quando: "Vence hoje", situacao: "hoje", dias: 0, responsavel: "Rafael Moura", acao: "Confirmar comprovante" },
  { id: "p5", area: "financeiro", titulo: "Simples Nacional", contexto: "R$ 6.478,07 · Inter conta corrente", quando: "Vence em 7 dias", situacao: "atencao", dias: 7, responsavel: "Helena Duarte Vasconcelos", acao: "Agendar pagamento" },
  { id: "p6", area: "documentos", titulo: "Autorização de venda sem assinatura do cônjuge", contexto: "QI 10 Bloco T apto 207 · Guará I", quando: "Enviada há 5 dias", situacao: "atencao", dias: 2, responsavel: "Marina Albuquerque de Sá Figueiredo", acao: "Reenviar link de assinatura" },
  { id: "p7", area: "financiamento", titulo: "Vistoria de engenharia", contexto: "SQSW 304 Bloco C apto 602 · Banco do Brasil", quando: "Em 2 dias", situacao: "info", dias: 2, responsavel: "Bianca Teles", acao: "Confirmar acesso ao imóvel" },
  { id: "p8", area: "locacao", titulo: "Vistoria de saída", contexto: "Águas Claras, Rua 36 Sul, lote 5, apto 1.901", quando: "Em 3 dias", situacao: "info", dias: 3, responsavel: "Otávio Lins", acao: "Agendar vistoriador" },
];

export type Etapa = { nome: string; prevista: string; realizada?: string; situacao: "feita" | "atual" | "futura" | "atrasada"; responsavel?: string; nota?: string };
export const PROCESSO_VENDA = {
  codigo: "Venda 2026/031",
  imovel: "SQN 312 Bloco K apartamento 504 — Edifício Jardim das Paineiras",
  bairro: "Asa Norte",
  valor: 1_180_000,
  comprador: "Thiago Albuquerque Ramos e Letícia Fernandes Albuquerque",
  vendedor: "Espólio de Maria Aparecida Siqueira Brandão (inventariante: Paulo Brandão)",
  corretor: "Marina Albuquerque de Sá Figueiredo",
  captador: "Caio Nogueira",
  responsavel: "Rafael Moura",
  prazoFinal: "2026-11-28",
  etapas: [
    { nome: "Contrato assinado", prevista: "2026-08-20", realizada: "2026-08-20", situacao: "feita", responsavel: "Rafael Moura" },
    { nome: "Pagamento do sinal", prevista: "2026-08-25", realizada: "2026-08-26", situacao: "feita", responsavel: "Rafael Moura", nota: "R$ 118.000 via TED" },
    { nome: "Trâmites bancários", prevista: "2026-09-30", realizada: "2026-10-02", situacao: "feita", responsavel: "Bianca Teles" },
    { nome: "Escritura + intermediária", prevista: "2026-10-10", situacao: "atrasada", responsavel: "Rafael Moura", nota: "Aguardando alvará do inventário" },
    { nome: "Registro", prevista: "2026-10-31", situacao: "futura", responsavel: "Rafael Moura" },
    { nome: "Liberação de recursos bancários", prevista: "2026-11-14", situacao: "futura", responsavel: "Bianca Teles" },
    { nome: "Entrega de chaves", prevista: "2026-11-28", situacao: "futura", responsavel: "Marina Albuquerque de Sá Figueiredo" },
  ] as Etapa[],
  ocasionais: [{ nome: "Alvará judicial", situacao: "Em andamento", nota: "Processo 0701234-56.2026.8.07.0001 · 2ª Vara de Órfãos e Sucessões" }],
  historico: [
    { quando: "Hoje, 09:12", quem: "Rafael Moura", texto: "Cartório informou que a escritura depende do alvará." },
    { quando: "10/10, 17:40", quem: "Sistema", texto: "Prazo de “Escritura + intermediária” venceu." },
    { quando: "02/10, 11:05", quem: "Bianca Teles", texto: "Concluiu “Trâmites bancários”. Contrato do banco anexado." },
    { quando: "26/08, 14:22", quem: "Rafael Moura", texto: "Sinal confirmado: comprovante de R$ 118.000 anexado." },
  ],
  documentos: [
    { nome: "Contrato de compra e venda (assinado).pdf", tamanho: "1,8 MB", situacao: "ok" as Situacao, rotulo: "Assinado" },
    { nome: "Comprovante do sinal.pdf", tamanho: "220 KB", situacao: "ok" as Situacao, rotulo: "Conferido" },
    { nome: "Certidão de ônus atualizada", tamanho: "—", situacao: "atencao" as Situacao, rotulo: "Falta enviar" },
    { nome: "Alvará judicial", tamanho: "—", situacao: "rascunho" as Situacao, rotulo: "Aguardando" },
  ],
};

export type Lancamento = { id: string; descricao: string; pessoa: string; categoria: string; conta: string; vencimento: string; valor: number; tipo: "despesa" | "receita"; situacao: "pago" | "hoje" | "vencido" | "aberto" };
export const LANCAMENTOS: Lancamento[] = [
  { id: "l1", descricao: "Condomínio — Graúna 1601B", pessoa: "Condomínio Residencial Graúna", categoria: "Condomínio de inquilinos", conta: "Inter", vencimento: "2026-10-10", valor: 1938.96, tipo: "despesa", situacao: "vencido" },
  { id: "l2", descricao: "IPTU — SQS 401 apto 101", pessoa: "SEFAZ-DF", categoria: "IPTU de inquilinos", conta: "Inter", vencimento: "2026-10-13", valor: 236.08, tipo: "despesa", situacao: "hoje" },
  { id: "l3", descricao: "Honorários advocatícios — acompanhamento de ação de despejo e cobrança de garantia locatícia (processo de 2025)", pessoa: "Campos Sobrinho Sociedade Individual de Advocacia", categoria: "Honorários advocatícios", conta: "Inter", vencimento: "2026-10-13", valor: 300, tipo: "despesa", situacao: "hoje" },
  { id: "l4", descricao: "Seguro incêndio Yellum", pessoa: "Yellum Seguros", categoria: "Seguro incêndio de inquilinos", conta: "Inter", vencimento: "2026-10-14", valor: 130.19, tipo: "despesa", situacao: "aberto" },
  { id: "l5", descricao: "Comissão de venda — SQN 312 K 504", pessoa: "Thiago Albuquerque Ramos", categoria: "Comissão de venda", conta: "Sicoob", vencimento: "2026-10-15", valor: 35_400, tipo: "receita", situacao: "aberto" },
  { id: "l6", descricao: "Staff Contabilidade", pessoa: "Staff Contabilidade", categoria: "Honorários contábeis", conta: "Inter", vencimento: "2026-10-15", valor: 694.1, tipo: "despesa", situacao: "aberto" },
  { id: "l7", descricao: "Portal imobiliário", pessoa: "DF Imóveis.com S/A", categoria: "Portais imobiliários", conta: "Inter", vencimento: "2026-10-20", valor: 2275.25, tipo: "despesa", situacao: "aberto" },
  { id: "l8", descricao: "Simples Nacional", pessoa: "Receita Federal", categoria: "Simples Nacional", conta: "Inter", vencimento: "2026-10-20", valor: 6478.07, tipo: "despesa", situacao: "aberto" },
  { id: "l9", descricao: "Tráfego pago", pessoa: "Lume Soluções Digitais", categoria: "Publicidade", conta: "Inter", vencimento: "2026-10-07", valor: 1000, tipo: "despesa", situacao: "pago" },
  { id: "l10", descricao: "Diária de limpeza", pessoa: "Izabel E. A. Miranda", categoria: "Limpeza", conta: "Inter", vencimento: "2026-10-12", valor: 202, tipo: "despesa", situacao: "pago" },
];
export const CONTAS = [
  { nome: "Inter — conta corrente", saldo: 21_570.26, banco: "Inter" },
  { nome: "Sicoob — conta corrente", saldo: 16_182.95, banco: "Sicoob" },
  { nome: "Inter — CDB liquidez diária PJ", saldo: 89_511.8, banco: "Inter" },
];

export type MinhaVenda = { id: string; imovel: string; bairro: string; valor: number; etapa: string; proxima: string; quando: string; situacao: Situacao; comissaoPrevista: number | null; comissaoRecebida: number; ultimaAtualizacao: string };
export const MINHAS_VENDAS: MinhaVenda[] = [
  { id: "m1", imovel: "SQN 312 Bloco K apto 504", bairro: "Asa Norte", valor: 1_180_000, etapa: "Escritura + intermediária", proxima: "Aguardando alvará do inventário", quando: "Atrasada 3 dias", situacao: "atrasado", comissaoPrevista: 17_700, comissaoRecebida: 0, ultimaAtualizacao: "Cartório informou que a escritura depende do alvará. (hoje)" },
  { id: "m2", imovel: "Casa no Park Way, Quadra 26, Conjunto 4, Lote 7", bairro: "Park Way", valor: 2_350_000, etapa: "Pagamento do sinal", proxima: "Comprovante do sinal", quando: "Vence hoje", situacao: "hoje", comissaoPrevista: 35_250, comissaoRecebida: 0, ultimaAtualizacao: "Comprador enviou o contrato assinado. (ontem)" },
  { id: "m3", imovel: "QI 10 Bloco T apto 207", bairro: "Guará I", valor: 400_000, etapa: "Registro", proxima: "Matrícula atualizada", quando: "Em 9 dias", situacao: "info", comissaoPrevista: null, comissaoRecebida: 0, ultimaAtualizacao: "Escritura lavrada no 2º Ofício. (08/10)" },
  { id: "m4", imovel: "Residencial Via Bella, apto 803", bairro: "Águas Claras", valor: 690_000, etapa: "Concluída", proxima: "—", quando: "Concluída em 22/09", situacao: "ok", comissaoPrevista: 10_350, comissaoRecebida: 10_350, ultimaAtualizacao: "Comissão paga em 30/09." },
];

export const RESULTADOS = {
  ano: 2026,
  metaVgv: 42_000_000,
  vgv: 31_460_000,
  vgc: 1_271_400,
  vendas: 27,
  porMes: [
    { mes: "jan", vgv: 1_850_000 }, { mes: "fev", vgv: 2_400_000 }, { mes: "mar", vgv: 3_920_000 }, { mes: "abr", vgv: 2_160_000 },
    { mes: "mai", vgv: 4_480_000 }, { mes: "jun", vgv: 3_010_000 }, { mes: "jul", vgv: 0 }, { mes: "ago", vgv: 5_270_000 },
    { mes: "set", vgv: 4_890_000 }, { mes: "out", vgv: 3_480_000 },
  ],
  ranking: [
    { nome: "Marina Albuquerque de Sá Figueiredo", vgv: 9_840_000, vendas: 7 },
    { nome: "Caio Nogueira", vgv: 7_120_000, vendas: 6 },
    { nome: "Rafael Moura", vgv: 6_300_000, vendas: 5 },
    { nome: "Juliana Prates", vgv: 4_550_000, vendas: 5 },
    { nome: "Eduardo Kenji Watanabe", vgv: 3_650_000, vendas: 4 },
  ],
  pendencias: 3,
};

// --------------------------------------------------------- avaliação (estudo de mercado)

export type Referencia = { id: string; endereco: string; area: number; preco: number; tipoPreco: "anuncio" | "negocio"; data: string; origem: string; ajustes: Record<string, -1 | 0 | 1>; usar: boolean; observacao?: string };
export const FATORES = [
  { chave: "conservacao", rotulo: "Conservação", pct: 5 },
  { chave: "andar", rotulo: "Andar e posição", pct: 3 },
  { chave: "vagas", rotulo: "Vagas", pct: 4 },
  { chave: "localizacao", rotulo: "Localização na quadra", pct: 5 },
] as const;
export const FATOR_OFERTA = 0.9;

export const IMOVEL_AVALIADO = {
  cliente: "Wagner Luís Pereira",
  finalidade: "venda" as const,
  tipo: "Apartamento",
  endereco: "QI 10 Bloco T apartamento 207",
  bairro: "Guará I",
  area: 56.06,
  quartos: 2,
  vagas: 1,
};

export const REFERENCIAS: Referencia[] = [
  { id: "r1", endereco: "QI 10 Bloco E apto 304", area: 56, preco: 430_000, tipoPreco: "anuncio", data: "2026-10-09", origem: "Portal (link guardado)", ajustes: { conservacao: 0, andar: 0, vagas: 0, localizacao: 0 }, usar: true },
  { id: "r2", endereco: "QI 10 Bloco O apto 110", area: 56, preco: 445_000, tipoPreco: "anuncio", data: "2026-10-09", origem: "Portal (link guardado)", ajustes: { conservacao: 1, andar: 0, vagas: 0, localizacao: 0 }, usar: true, observacao: "Reformado em 2025" },
  { id: "r3", endereco: "QI 8 Bloco C apto 201", area: 62, preco: 455_000, tipoPreco: "anuncio", data: "2026-09-30", origem: "Portal (link guardado)", ajustes: { conservacao: 0, andar: 0, vagas: 1, localizacao: 0 }, usar: true, observacao: "2 vagas" },
  { id: "r4", endereco: "QI 12 Bloco A apto 105", area: 55, preco: 382_000, tipoPreco: "negocio", data: "2026-08-14", origem: "Venda concluída pela Sacra", ajustes: { conservacao: -1, andar: 0, vagas: 0, localizacao: 0 }, usar: true, observacao: "Precisava de reforma" },
  { id: "r5", endereco: "QI 10 Bloco T apto 207", area: 56.06, preco: 450_000, tipoPreco: "anuncio", data: "2026-10-09", origem: "Portal (link guardado)", ajustes: { conservacao: 0, andar: 0, vagas: 0, localizacao: 0 }, usar: false, observacao: "É o próprio imóvel avaliado" },
  { id: "r6", endereco: "QE 40 Conjunto C casa 18", area: 140, preco: 890_000, tipoPreco: "anuncio", data: "2026-07-01", origem: "Estudo anterior (reconferir)", ajustes: { conservacao: 0, andar: 0, vagas: 0, localizacao: 0 }, usar: false, observacao: "Casa, outra tipologia" },
];
