/** Dados fictícios para testes e para o script de conferência do PDF. */
import type { DadosCps, DadosLocacao, Pessoa } from "./montar";

export const PESSOA_FICTICIA: Pessoa = {
  nome: "Fulana de Tal Exemplo",
  nacionalidade: "brasileira",
  profissao: "analista",
  cpf: "000.000.001-91",
  rg: "0.000.000 SSP/DF",
  email: "fulana@exemplo.com",
  estadoCivil: "solteira",
  endereco: "SQN 000 Bloco Z Apto 000, Asa Norte, Brasília/DF",
};

export const LOCACAO_FICTICIA: DadosLocacao = {
  locador: { nome: "Beltrano Proprietário Exemplo", cpf: "000.000.002-72", endereco: "" },
  locatario: PESSOA_FICTICIA,
  fiadores: [
    {
      ...PESSOA_FICTICIA,
      nome: "Ciclano Fiador Exemplo",
      cpf: "000.000.003-53",
      estadoCivil: "casado",
      conjuge: { nome: "Cônjuge Fictícia Exemplo", cpf: "000.000.004-34", rg: "", nacionalidade: "brasileira", profissao: "professora", email: "" },
    },
  ],
  imovel: {
    endereco: "Rua Fictícia 00, Lote 00, Apto 000, Águas Claras, Brasília/DF",
    areaPrivativa: "65,00 m²",
    matricula: "000.000",
    cartorio: "3º Ofício de Registro de Imóveis do DF",
    inscricaoIptu: "00000000",
    vagaGaragem: "01 vaga coberta (nº 00)",
    composicao: "2 quartos, sala, cozinha, banheiro social e área de serviço",
  },
  garantia: "fiador",
  tituloValorCentavos: 0,
  tituloProposta: "",
  prazoMeses: 30,
  inicio: "2026-11-10",
  aluguelCentavos: 250000,
  diaVencimento: 10,
  primeiroVencimento: "2026-12-10",
  primeiroPeriodoInicio: "2026-11-10",
  primeiroPeriodoFim: "2026-12-09",
  descontoCentavos: 20000,
  diaLimiteDesconto: 10,
  dataAssinatura: "2026-11-09",
};

export const CPS_FICTICIO: DadosCps = {
  contratante: { ...PESSOA_FICTICIA, nome: "Beltrano Proprietário Exemplo", cpf: "000.000.002-72" },
  imovel: LOCACAO_FICTICIA.imovel,
  aluguelCentavos: 250000,
  modalidade: "garantida",
  beneficiarios: [{ nome: "Beltrano Proprietário Exemplo", cpf: "000.000.002-72", percentual: "100%", banco: "Banco Exemplo", agenciaConta: "0000 / 00000-0", pix: "beltrano@exemplo.com" }],
  dataAssinatura: "2026-11-09",
};
