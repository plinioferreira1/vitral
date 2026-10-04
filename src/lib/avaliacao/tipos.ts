/**
 * Tipos e listas do módulo Avaliação de Imóveis (estudo comercial de
 * preço e PTAM). Sem dependência de banco: usado pelas telas, pelos
 * cálculos e pelo PDF.
 */

export const MODALIDADES = ["estudo_comercial", "ptam"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export const FINALIDADES = ["venda", "locacao"] as const;
export type Finalidade = (typeof FINALIDADES)[number];

export const TIPOLOGIAS = ["residencial", "comercial", "terreno"] as const;
export type Tipologia = (typeof TIPOLOGIAS)[number];

export const STATUS_AVALIACAO = ["rascunho", "em_revisao", "aprovado", "emitido", "arquivado"] as const;
export type StatusAvaliacao = (typeof STATUS_AVALIACAO)[number];

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  estudo_comercial: "Estudo comercial de preço",
  ptam: "Parecer Técnico de Avaliação Mercadológica (PTAM)",
};
export const ROTULO_MODALIDADE_CURTO: Record<Modalidade, string> = {
  estudo_comercial: "Estudo comercial",
  ptam: "PTAM",
};
export const ROTULO_FINALIDADE: Record<Finalidade, string> = { venda: "Venda", locacao: "Locação" };
export const ROTULO_TIPOLOGIA: Record<Tipologia, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  terreno: "Terreno",
};
export const ROTULO_STATUS: Record<StatusAvaliacao, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  emitido: "Emitido",
  arquivado: "Arquivado",
};

export const VISTORIA_STATUS = ["nao_realizada", "agendada", "realizada"] as const;
export type VistoriaStatus = (typeof VISTORIA_STATUS)[number];
export const ROTULO_VISTORIA: Record<VistoriaStatus, string> = {
  nao_realizada: "Não realizada",
  agendada: "Agendada",
  realizada: "Realizada",
};

export const SITUACOES_CHECKLIST = ["conforme", "atencao", "nao_se_aplica"] as const;
export type SituacaoChecklist = (typeof SITUACOES_CHECKLIST)[number];
export const ROTULO_SITUACAO_CHECKLIST: Record<SituacaoChecklist, string> = {
  conforme: "Conforme",
  atencao: "Requer atenção",
  nao_se_aplica: "Não se aplica",
};

/** Itens conferidos na vistoria, por tipologia. */
export const CHECKLIST_VISTORIA: Record<Tipologia, { chave: string; rotulo: string }[]> = {
  residencial: [
    { chave: "identificacao", rotulo: "Endereço e unidade conferem com o cadastro" },
    { chave: "area", rotulo: "Área e distribuição dos cômodos compatíveis com o informado" },
    { chave: "estrutura", rotulo: "Estrutura, paredes e tetos (fissuras, infiltrações)" },
    { chave: "pisos", rotulo: "Pisos e revestimentos" },
    { chave: "esquadrias", rotulo: "Portas, janelas e esquadrias" },
    { chave: "hidraulica", rotulo: "Instalações hidráulicas aparentes" },
    { chave: "eletrica", rotulo: "Instalações elétricas aparentes" },
    { chave: "cozinha_banheiros", rotulo: "Cozinha, banheiros e áreas molhadas" },
    { chave: "garagem", rotulo: "Vagas de garagem e depósito" },
    { chave: "areas_comuns", rotulo: "Áreas comuns e fachada do edifício/condomínio" },
    { chave: "ocupacao", rotulo: "Situação de ocupação" },
  ],
  comercial: [
    { chave: "identificacao", rotulo: "Endereço e unidade conferem com o cadastro" },
    { chave: "area", rotulo: "Área útil e layout compatíveis com o informado" },
    { chave: "fachada", rotulo: "Fachada, vitrine e visibilidade" },
    { chave: "acesso", rotulo: "Acessos, acessibilidade e estacionamento" },
    { chave: "estrutura", rotulo: "Estrutura, piso e pé-direito" },
    { chave: "eletrica", rotulo: "Instalações elétricas e carga disponível" },
    { chave: "hidraulica", rotulo: "Instalações hidráulicas e sanitários" },
    { chave: "climatizacao", rotulo: "Climatização e exaustão" },
    { chave: "seguranca", rotulo: "Prevenção de incêndio e segurança" },
    { chave: "ocupacao", rotulo: "Situação de ocupação e uso atual" },
  ],
  terreno: [
    { chave: "identificacao", rotulo: "Localização e identificação conferem com o cadastro" },
    { chave: "dimensoes", rotulo: "Frente, fundo e formato compatíveis com o informado" },
    { chave: "topografia", rotulo: "Topografia e nivelamento" },
    { chave: "divisas", rotulo: "Divisas, muros e confrontações" },
    { chave: "acesso", rotulo: "Acesso e pavimentação da via" },
    { chave: "infraestrutura", rotulo: "Água, esgoto, energia e iluminação pública" },
    { chave: "ocupacao", rotulo: "Ocupações, construções ou benfeitorias existentes" },
    { chave: "restricoes", rotulo: "Restrições aparentes (áreas de preservação, servidões)" },
  ],
};

/** Fatores de ajuste de comparabilidade (o percentual é sempre informado por pessoa). */
export const FATORES_AJUSTE = [
  "Localização",
  "Área",
  "Conservação",
  "Padrão de acabamento",
  "Idade",
  "Andar",
  "Vagas de garagem",
  "Vista / posição",
  "Mobília",
  "Oferta (desconto de negociação)",
  "Outro",
] as const;

export type AjusteComparavel = {
  fator: string;
  /** positivo valoriza o comparável; negativo desvaloriza */
  percentual: number;
  justificativa: string;
  /** de onde veio o percentual (ex.: "observação em vistoria", "critério da avaliadora") */
  origem?: string;
  autor_id?: string;
  autor_nome?: string;
  em?: string;
};

export type Comparavel = {
  id: string;
  ordem: number;
  identificacao: string;
  regiao: string | null;
  finalidade: Finalidade;
  tipologia: Tipologia | null;
  area_m2: number | null;
  quartos: number | null;
  suites: number | null;
  vagas: number | null;
  preco: number | null;
  tipo_preco: "oferta" | "transacao";
  fonte_tipo: "interno" | "manual" | "externo";
  fonte_nome: string | null;
  fonte_url: string | null;
  referencia_interna: string | null;
  data_coleta: string | null;
  data_atualizacao: string | null;
  status_anuncio: string | null;
  diferencas: string | null;
  observacoes: string | null;
  ajustes: AjusteComparavel[];
  incluido: boolean;
  duplicata: boolean;
  reconferir: boolean;
  motivo_exclusao: string | null;
  foto_caminho: string | null;
};

export const ROTULO_FONTE_TIPO: Record<Comparavel["fonte_tipo"], string> = {
  interno: "Base interna do Vitral",
  manual: "Pesquisa manual",
  externo: "Fonte externa autorizada",
};
export const ROTULO_TIPO_PRECO: Record<Comparavel["tipo_preco"], string> = {
  oferta: "Preço de oferta (anúncio)",
  transacao: "Transação confirmada",
};

/** Limiares que só geram ALERTAS na tela — definidos pela avaliadora. */
export type Limiares = {
  amostraMinima: number;
  idadeMaximaDias: number;
  diferencaAreaPct: number;
  desvioAtipicoPct: number;
};
export const LIMIARES_PADRAO: Limiares = {
  amostraMinima: 3,
  idadeMaximaDias: 90,
  diferencaAreaPct: 30,
  desvioAtipicoPct: 30,
};

/** Campos livres do formulário (coluna `dados`). Tudo opcional. */
export type DadosAvaliacao = {
  // identificação e finalidade
  solicitante_nome?: string;
  solicitante_documento?: string;
  solicitante_contato?: string;
  proprietario_documento?: string;
  objetivo?: string;
  destinatario?: string;
  // imóvel
  subtipo?: string;
  endereco?: string;
  complemento?: string;
  uf?: string;
  cep?: string;
  endereco_abreviado_pdf?: boolean;
  matricula?: string;
  cartorio?: string;
  inscricao_iptu?: string;
  area_total_m2?: number;
  area_terreno_m2?: number;
  quartos?: number;
  suites?: number;
  banheiros?: number;
  vagas?: number;
  andar?: string;
  posicao_solar?: string;
  idade_anos?: number;
  estado_conservacao?: string;
  padrao_acabamento?: string;
  valor_condominio?: number;
  valor_iptu?: number;
  frente_m?: number;
  topografia?: string;
  zoneamento?: string;
  pe_direito_m?: number;
  diferenciais?: string;
  benfeitorias?: string;
  confrontacoes?: string;
  medidas_perimetricas?: string;
  aproveitamento_economico?: string;
  documentos_conferidos?: string;
  lacunas?: string;
  // vistoria
  vistoria_status?: VistoriaStatus;
  vistoria_data?: string;
  vistoria_responsavel?: string;
  vistoria_checklist?: Record<string, { situacao?: SituacaoChecklist; observacao?: string }>;
  vistoria_ressalvas?: string;
  vistoria_divergencias?: string;
  // localização
  localizacao_descricao?: string;
  localizacao_atributos?: string;
  localizacao_influencia?: string;
  infraestrutura_entorno?: string;
  // pesquisa de mercado
  recorte_geografico?: string;
  recorte_periodo?: string;
  recorte_criterios?: string;
  ampliacao_justificativa?: string;
  amostra_justificativa?: string;
  // análise e textos
  justificativa_valor?: string;
  justificativa_faixa?: string;
  fundamentacao?: string;
  parecer_avaliadora?: string;
  carta_texto?: string;
  estrategia_posicionamento?: string;
  estrategia_publico?: string;
  estrategia_preparacao?: string;
  estrategia_canais?: string;
  estrategia_reavaliacao?: string;
  conclusao_texto?: string;
  limitacoes_texto?: string;
  // PTAM
  selo_numero?: string;
  dam_numero?: string;
  anexos_observacoes?: string;
};

export type Responsavel = {
  usuario_id: string | null;
  nome: string;
  creci: string;
  cnai: string;
  curriculo: string;
  telefone: string;
  email: string;
};

export type ArquivoAvaliacao = {
  id: string;
  tipo: "imovel" | "vistoria" | "mapa" | "matricula" | "anexo";
  caminho_storage: string;
  nome_arquivo: string;
  legenda: string | null;
  capa: boolean;
  ordem: number;
  mime_type: string;
};

/** Cabeçalho da avaliação (colunas próprias da tabela). */
export type AvaliacaoBase = {
  id: string;
  codigo: string;
  modalidade: Modalidade;
  finalidade: Finalidade;
  tipologia: Tipologia;
  status: StatusAvaliacao;
  titulo: string;
  proprietario_nome: string | null;
  bairro: string | null;
  cidade: string | null;
  data_base: string | null;
  area_m2: number | null;
  dados: DadosAvaliacao;
  valor_calculado: number | null;
  faixa_min: number | null;
  faixa_max: number | null;
  faixa_manual: boolean;
  valor_sugerido: number | null;
  margem_negociacao_pct: number | null;
  valor_proprietario: number | null;
  revisao: number;
  versao_atual: number;
};

export const ETAPAS_EDITOR = [
  { chave: "dados", rotulo: "Dados e finalidade" },
  { chave: "imovel", rotulo: "Imóvel e fotos" },
  { chave: "vistoria", rotulo: "Vistoria" },
  { chave: "localizacao", rotulo: "Localização" },
  { chave: "comparaveis", rotulo: "Comparáveis" },
  { chave: "preco", rotulo: "Ajustes e preço" },
  { chave: "textos", rotulo: "Textos" },
  { chave: "revisao", rotulo: "Revisão e emissão" },
  { chave: "historico", rotulo: "Histórico" },
] as const;
export type EtapaEditor = (typeof ETAPAS_EDITOR)[number]["chave"];

export function valorDaListaLocal<T extends string>(lista: readonly T[], valor: unknown, padrao: T): T {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return (lista as readonly string[]).includes(texto) ? (texto as T) : padrao;
}
