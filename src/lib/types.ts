export type PerfilUsuario =
  | "admin"
  | "diretora"
  | "gerente"
  | "corretor"
  | "correspondente"
  | "financeiro";

export type TipoRegraData =
  | "fixa"
  | "relativa_criacao"
  | "relativa_etapa_anterior"
  | "manual";

export type StatusProcesso = "ativo" | "pendente" | "concluido" | "arquivado" | "cancelado";
export type StatusEtapa = "pendente" | "em_andamento" | "concluida" | "bloqueada";

export type NivelAcesso = "diretor" | "gerente" | "supervisor" | "auxiliar";

export const NIVEL_ACESSO_LABEL: Record<NivelAcesso, string> = {
  diretor: "Diretor",
  gerente: "Gerente",
  supervisor: "Supervisor",
  auxiliar: "Auxiliar",
};

export interface Usuario {
  id: string;
  tenant_id: string | null;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  nivel_acesso: NivelAcesso;
  cargo: string | null;
  foto_url: string | null;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
}

export interface Banco {
  id: string;
  tenant_id: string;
  nome: string;
  contato: string | null;
}

export interface Corretor {
  id: string;
  tenant_id: string;
  usuario_id: string | null;
  nome: string;
  percentual_comissao_padrao: number | null;
}

export interface Imovel {
  id: string;
  tenant_id: string;
  endereco: string;
  matricula: string | null;
  tipo: "residencial" | "comercial" | "terreno";
  valor: number | null;
  proprietario_id: string | null;
}

export interface ModeloProcesso {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface ModeloEtapa {
  id: string;
  modelo_processo_id: string;
  ordem: number;
  nome: string;
  responsavel_padrao_perfil: PerfilUsuario | null;
  tipo_regra_data: TipoRegraData;
  dias_offset: number;
  etapa_referencia_id: string | null;
  obrigatoria: boolean;
}

export interface ModeloChecklistItem {
  id: string;
  modelo_etapa_id: string;
  descricao: string;
  ordem: number;
}

export type StatusComissao = "0% pago" | "50% pago" | "100% pago" | "cancelada";

export type CategoriaProcesso = "venda" | "financiamento" | "locacao";

export const CATEGORIA_LABEL: Record<CategoriaProcesso, string> = {
  venda: "Venda",
  financiamento: "Financiamento",
  locacao: "Locação",
};

export interface Processo {
  id: string;
  tenant_id: string;
  modelo_processo_id: string | null;
  numero_processo: string;
  comprador_id: string | null;
  vendedor_id: string | null;
  imovel_id: string | null;
  banco_id: string | null;
  corretor_id: string | null;
  responsavel_id: string | null;
  tipo: string | null;
  status: StatusProcesso;
  valor_total: number | null;
  categoria: CategoriaProcesso;
  valor_financiado: number | null;
  origem: string | null;
  indicacao_id: string | null;
  data_criacao: string;
  data_conclusao: string | null;
  criado_em: string;
}

export interface EtapaPadrao {
  id: string;
  tenant_id: string;
  nome: string;
  ordem: number;
  categoria: CategoriaProcesso;
}

export type TipoContaLocacao = "iptu" | "condominio" | "agua" | "luz" | "gas";
export type StatusContaLocacao = "pago" | "pendente" | "nao_aplicavel";
export type TipoIptuLocacao = "parcelado" | "cota_unica";
export type ResponsavelPagamentoLocacao = "locador" | "locatario";

export const RESPONSAVEL_PAGAMENTO_LABEL: Record<ResponsavelPagamentoLocacao, string> = {
  locador: "Locador",
  locatario: "Locatário",
};

export const TIPO_CONTA_LABEL: Record<TipoContaLocacao, string> = {
  iptu: "IPTU / TLP",
  condominio: "Condomínio",
  agua: "Água",
  luz: "Luz",
  gas: "Gás",
};

export interface ContratoLocacao {
  id: string;
  tenant_id: string;
  numero: string;
  imovel_id: string | null;
  locador_id: string | null;
  locatario_id: string | null;
  emite_nf: boolean;
  iptu_inscricao: string | null;
  iptu_tipo: TipoIptuLocacao | null;
  condominio_administradora: string | null;
  condominio_contato: string | null;
  agua_inscricao: string | null;
  agua_codigo_cliente: string | null;
  luz_codigo_cliente: string | null;
  responsavel_iptu: ResponsavelPagamentoLocacao | null;
  responsavel_condominio: ResponsavelPagamentoLocacao | null;
  responsavel_agua: ResponsavelPagamentoLocacao | null;
  responsavel_luz: ResponsavelPagamentoLocacao | null;
  responsavel_gas: ResponsavelPagamentoLocacao | null;
  ativo: boolean;
  responsavel_id: string | null;
  observacoes: string | null;
  data_encerramento: string | null;
}

export interface ContaLocacao {
  id: string;
  contrato_id: string;
  tipo: TipoContaLocacao;
  competencia: string;
  status: StatusContaLocacao;
  valor: number | null;
  vencimento: string | null;
}

export interface TarefaMensal {
  id: string;
  tenant_id: string;
  nome: string;
  regra: string | null;
  ordem: number;
}

export interface Comissao {
  id: string;
  processo_id: string;
  beneficiario_id: string | null;
  valor_previsto: number | null;
  valor_recebido: number | null;
  data_prevista: string | null;
  data_recebida: string | null;
  status: StatusComissao;
}

export interface Etapa {
  id: string;
  processo_id: string;
  modelo_etapa_id: string | null;
  nome: string;
  responsavel_id: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  status: StatusEtapa;
  ordem: number;
  etapa_dependencia_id: string | null;
}

export interface ChecklistItem {
  id: string;
  etapa_id: string;
  descricao: string;
  concluido: boolean;
  concluido_por: string | null;
  concluido_em: string | null;
  ordem: number;
}

export interface Comentario {
  id: string;
  processo_id: string;
  etapa_id: string | null;
  usuario_id: string | null;
  texto: string;
  criado_em: string;
}

// Placeholder mínimo para o supabase-js tipar os clients.
// (Não é um schema gerado automaticamente — ver README para gerar
// com `supabase gen types typescript` quando o projeto já existir.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
