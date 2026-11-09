/**
 * Monta o contrato de locação residencial e o contrato de prestação de
 * serviços (CPS) a partir dos dados conferidos pelo gestor. Funções puras:
 * nada é lido do banco aqui, e o servidor sempre remonta antes de gerar o PDF.
 * Valores em centavos inteiros.
 */

import { inteiroPorExtenso, valorComExtenso } from "@/lib/termo-entrega/extenso";
import {
  CLAUSULA_GARANTIA,
  CLAUSULAS_CPS,
  CLAUSULAS_LOCACAO,
  FECHO_CPS,
  FECHO_LOCACAO,
  PREAMBULO_CPS,
  PREAMBULO_LOCACAO,
  PROCURACAO,
  PROCURACAO_TITULO,
  type Clausula,
} from "./textos";

export const GARANTIAS = {
  fiador: "Fiador",
  seguro_fianca: "Seguro Fiança (Loft)",
  garantia_investe: "Garantia Investe (Loft)",
  titulo_capitalizacao: "Título de Capitalização (Brasilcap)",
} as const;
export type Garantia = keyof typeof GARANTIAS;

export const MODALIDADES_CPS = {
  tradicional: "Tradicional – Taxa de Administração de 10% (Repasse em até 5 (cinco) dias úteis após recebimento)",
  garantida: "Garantida – Taxa de Administração de 15% (Repasse em até 1 (um) dia útil após o vencimento)",
} as const;
export type ModalidadeCps = keyof typeof MODALIDADES_CPS;

export type Pessoa = {
  nome: string;
  nacionalidade: string;
  profissao: string;
  cpf: string;
  rg: string;
  email: string;
  estadoCivil: string;
  endereco: string;
};

export type Conjuge = { nome: string; cpf: string; rg: string; nacionalidade: string; profissao: string; email: string };

export type Fiador = Pessoa & { conjuge: Conjuge | null };

export type Imovel = {
  endereco: string;
  areaPrivativa: string;
  matricula: string;
  cartorio: string;
  inscricaoIptu: string;
  vagaGaragem: string;
  composicao: string;
};

export type DadosLocacao = {
  locador: { nome: string; cpf: string; endereco: string };
  locatario: Pessoa;
  fiadores: Fiador[];
  imovel: Imovel;
  garantia: Garantia;
  tituloValorCentavos: number;
  tituloProposta: string;
  prazoMeses: number;
  inicio: string; // AAAA-MM-DD
  aluguelCentavos: number;
  diaVencimento: number;
  primeiroVencimento: string;
  primeiroPeriodoInicio: string;
  primeiroPeriodoFim: string;
  descontoCentavos: number;
  diaLimiteDesconto: number;
  dataAssinatura: string;
};

export type Beneficiario = { nome: string; cpf: string; percentual: string; banco: string; agenciaConta: string; pix: string };

export type DadosCps = {
  contratante: Pessoa;
  imovel: Imovel;
  aluguelCentavos: number;
  modalidade: ModalidadeCps;
  /** impressos no contrato e nunca gravados no Vitral */
  beneficiarios: Beneficiario[];
  dataAssinatura: string;
};

// ---------------------------------------------------------------
// documento genérico que o PDF desenha
// ---------------------------------------------------------------

export type LinhaQuadro = [string, string] | [string, string, string, string];
export type Quadro = { titulo: string; linhas: LinhaQuadro[]; colunas?: boolean };
export type Documento = {
  titulo: string;
  quadros: Quadro[];
  preambulo: string[];
  clausulas: Clausula[];
  fecho: string;
  localData: string;
  assinaturas: { nome: string; papel: string }[];
  /** documento que vem em seguida, em página nova (a procuração do CPS) */
  anexo?: { titulo: string; secoes: Clausula[]; localData: string; assinaturas: { nome: string; papel: string }[] };
};

// ---------------------------------------------------------------
// datas e textos
// ---------------------------------------------------------------

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dataValida = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(`${iso}T12:00:00Z`));
const partes = (iso: string) => iso.split("-").map(Number) as [number, number, number];

export function dataPorExtenso(iso: string): string {
  if (!dataValida(iso)) return "XX de XXXX de XXXX";
  const [a, m, d] = partes(iso);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
export const dataCurta = (iso: string) => (dataValida(iso) ? iso.split("-").reverse().join("/") : "XX/XX/XXXX");
const diaMes = (iso: string) => (dataValida(iso) ? iso.split("-").reverse().slice(0, 2).join("/") : "XX/XX");

/** Término = início + prazo em meses − 1 dia (ex.: 10/11/2026 + 30 meses → 09/05/2029). */
export function dataTermino(inicio: string, meses: number): string {
  if (!dataValida(inicio) || !Number.isInteger(meses) || meses < 1) return "";
  const [a, m, d] = partes(inicio);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  alvo.setUTCDate(alvo.getUTCDate() - 1);
  return alvo.toISOString().slice(0, 10);
}

/** Período sugerido do 1º aluguel: do início até a véspera do 1º vencimento. */
export function periodoPrimeiroAluguel(inicio: string, primeiroVencimento: string): { inicio: string; fim: string } | null {
  if (!dataValida(inicio) || !dataValida(primeiroVencimento) || primeiroVencimento <= inicio) return null;
  const fim = new Date(Date.parse(`${primeiroVencimento}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);
  return { inicio, fim };
}

const mesesTexto = (n: number) => `${String(n).padStart(2, "0")} (${inteiroPorExtenso(n)}) ${n === 1 ? "mês" : "meses"}`;
const maiusc = (s: string) => s.trim().toUpperCase();
const ou = (s: string, padrao = "—") => (s.trim() ? s.trim() : padrao);

function linhasPessoa(p: Pessoa): LinhaQuadro[] {
  return [
    ["Nome:", maiusc(p.nome)],
    ["Nacionalidade:", ou(p.nacionalidade), "Profissão:", ou(p.profissao)],
    ["CPF:", ou(p.cpf), "RG:", ou(p.rg)],
    ["E-mail:", ou(p.email)],
    ["Estado Civil:", ou(p.estadoCivil)],
    ["Endereço:", ou(p.endereco)],
  ];
}

function linhasConjuge(c: Conjuge): LinhaQuadro[] {
  return [
    ["Nome:", maiusc(c.nome)],
    ["Nacionalidade:", ou(c.nacionalidade), "Profissão:", ou(c.profissao)],
    ["CPF:", ou(c.cpf), "RG:", ou(c.rg)],
    ["E-mail:", ou(c.email)],
  ];
}

function quadroImovel(i: Imovel, cps: boolean): Quadro {
  if (cps) {
    return {
      titulo: "IMÓVEL OBJETO DO CONTRATO",
      linhas: [
        ["Endereço:", ou(i.endereco)],
        ["Matrícula:", ou(i.matricula), "Cartório:", ou(i.cartorio)],
        ["Inscrição – GDF:", ou(i.inscricaoIptu)],
        ["Área Privativa:", ou(i.areaPrivativa)],
      ],
    };
  }
  return {
    titulo: "IMÓVEL OBJETO DO CONTRATO",
    linhas: [
      ["Endereço:", ou(i.endereco)],
      ["Área Privativa:", ou(i.areaPrivativa), "Matrícula:", ou(i.matricula)],
      ["Inscrição de IPTU:", ou(i.inscricaoIptu)],
      ["Vaga de Garagem:", ou(i.vagaGaragem)],
      ["Composição do Imóvel:", ou(i.composicao)],
    ],
  };
}

const preencher = (texto: string, valores: Record<string, string>) => texto.replace(/\{\{(\w+)\}\}/g, (_, k) => valores[k] ?? `{{${k}}}`);

// ---------------------------------------------------------------
// validação
// ---------------------------------------------------------------

const cpfOk = (v: string) => v.replace(/\D/g, "").length === 11 || v.replace(/\D/g, "").length === 14;

export function validarLocacao(d: DadosLocacao): string[] {
  const erros: string[] = [];
  if (!d.locador.nome.trim()) erros.push("Informe o nome do locador.");
  if (!cpfOk(d.locador.cpf)) erros.push("CPF/CNPJ do locador incompleto.");
  if (!d.locatario.nome.trim()) erros.push("Informe o nome do locatário.");
  if (!cpfOk(d.locatario.cpf)) erros.push("CPF do locatário incompleto.");
  if (!d.imovel.endereco.trim()) erros.push("Informe o endereço do imóvel.");
  if (!(d.garantia in GARANTIAS)) erros.push("Escolha a garantia.");
  if (d.garantia === "fiador") {
    if (d.fiadores.length < 1 || d.fiadores.length > 2) erros.push("Com garantia Fiador, informe um ou dois fiadores.");
    d.fiadores.forEach((f, i) => {
      if (!f.nome.trim() || !cpfOk(f.cpf)) erros.push(`Complete nome e CPF do fiador ${i + 1}.`);
      if (f.conjuge && (!f.conjuge.nome.trim() || !cpfOk(f.conjuge.cpf))) erros.push(`Complete nome e CPF do cônjuge do fiador ${i + 1}.`);
    });
  }
  if (d.garantia === "titulo_capitalizacao") {
    if (!(d.tituloValorCentavos > 0)) erros.push("Informe o valor nominal do Título de Capitalização.");
    if (!d.tituloProposta.trim()) erros.push("Informe o nº da proposta de subscrição do título.");
  }
  if (!Number.isInteger(d.prazoMeses) || d.prazoMeses < 1 || d.prazoMeses > 120) erros.push("Prazo em meses inválido.");
  if (!dataValida(d.inicio)) erros.push("Informe a data de início.");
  if (!(d.aluguelCentavos > 0)) erros.push("Informe o valor do aluguel.");
  if (!Number.isInteger(d.diaVencimento) || d.diaVencimento < 1 || d.diaVencimento > 31) erros.push("Dia de vencimento inválido.");
  if (!dataValida(d.primeiroVencimento)) erros.push("Informe o vencimento do 1º aluguel.");
  if (!dataValida(d.primeiroPeriodoInicio) || !dataValida(d.primeiroPeriodoFim) || d.primeiroPeriodoFim < d.primeiroPeriodoInicio)
    erros.push("Período do 1º aluguel inválido.");
  if (d.descontoCentavos < 0 || d.descontoCentavos >= d.aluguelCentavos) erros.push("Desconto de pontualidade inválido.");
  if (d.descontoCentavos > 0 && (!Number.isInteger(d.diaLimiteDesconto) || d.diaLimiteDesconto < 1 || d.diaLimiteDesconto > 31))
    erros.push("Dia limite do desconto inválido.");
  if (!dataValida(d.dataAssinatura)) erros.push("Informe a data do contrato.");
  return erros;
}

export function validarCps(d: DadosCps): string[] {
  const erros: string[] = [];
  if (!d.contratante.nome.trim()) erros.push("Informe o nome do contratante (proprietário).");
  if (!cpfOk(d.contratante.cpf)) erros.push("CPF/CNPJ do contratante incompleto.");
  if (!d.imovel.endereco.trim()) erros.push("Informe o endereço do imóvel.");
  if (!(d.aluguelCentavos > 0)) erros.push("Informe o aluguel inicial.");
  if (!(d.modalidade in MODALIDADES_CPS)) erros.push("Escolha a modalidade (tradicional ou garantida).");
  if (d.beneficiarios.length < 1 || d.beneficiarios.length > 2) erros.push("Informe um ou dois beneficiários.");
  d.beneficiarios.forEach((b, i) => {
    if (!b.nome.trim()) erros.push(`Informe o nome do beneficiário ${i + 1}.`);
  });
  if (d.beneficiarios.length === 2) {
    const soma = d.beneficiarios.reduce((s, b) => s + Number(b.percentual.replace(",", ".").replace("%", "")), 0);
    if (Math.abs(soma - 100) > 0.001) erros.push("Os percentuais dos beneficiários precisam somar 100%.");
  }
  if (!dataValida(d.dataAssinatura)) erros.push("Informe a data do contrato.");
  return erros;
}

// ---------------------------------------------------------------
// montagem
// ---------------------------------------------------------------

const SACRA = "SACRA SOLUÇÕES IMOBILIÁRIAS LTDA.";

export function montarLocacao(d: DadosLocacao): Documento {
  const termino = dataTermino(d.inicio, d.prazoMeses);
  const quadros: Quadro[] = [
    { titulo: "LOCADOR", linhas: [["Nome:", maiusc(d.locador.nome)], ["CPF:", ou(d.locador.cpf)], ["Endereço:", ou(d.locador.endereco, "Residente e Domiciliado / Estabelecido em Brasília/DF.")]] },
    { titulo: "LOCATÁRIO", linhas: linhasPessoa(d.locatario) },
  ];
  const comFiador = d.garantia === "fiador";
  if (comFiador) {
    d.fiadores.forEach((f, i) => {
      const rotulo = d.fiadores.length > 1 ? `FIADOR ${i + 1}` : "FIADOR";
      quadros.push({ titulo: rotulo, linhas: linhasPessoa(f) });
      if (f.conjuge) quadros.push({ titulo: `CÔNJUGE DO ${rotulo}`, linhas: linhasConjuge(f.conjuge) });
    });
  }
  quadros.push(quadroImovel(d.imovel, false));
  const condicoes: LinhaQuadro[] = [
    ["Prazo:", mesesTexto(d.prazoMeses)],
    ["Início:", dataPorExtenso(d.inicio), "Término:", dataPorExtenso(termino)],
    ["Aluguel mensal:", valorComExtenso(d.aluguelCentavos), "Vencimento:", `Todo dia ${String(d.diaVencimento).padStart(2, "0")} de cada mês`],
    [
      "1º aluguel:",
      `Vencimento em ${dataCurta(d.primeiroVencimento)} – valor proporcional de aluguel, IPTU/TLP e condomínio referente ao período de ${diaMes(d.primeiroPeriodoInicio)} a ${diaMes(d.primeiroPeriodoFim)}`,
    ],
  ];
  condicoes.push([
    "Desconto de pontualidade:",
    d.descontoCentavos > 0
      ? `${valorComExtenso(d.descontoCentavos)}, para pagamento até o dia ${String(d.diaLimiteDesconto).padStart(2, "0")} de cada mês`
      : "Não há",
  ]);
  quadros.push({ titulo: "CONDIÇÕES DA LOCAÇÃO", linhas: condicoes });

  const garantia = CLAUSULA_GARANTIA[d.garantia];
  const c14: Clausula = {
    titulo: garantia.titulo,
    paragrafos: garantia.paragrafos.map((p) =>
      preencher(p, { titulo_valor: valorComExtenso(d.tituloValorCentavos), titulo_proposta: d.tituloProposta.trim() })
    ),
  };
  const clausulas = [...CLAUSULAS_LOCACAO.slice(0, 13), c14, ...CLAUSULAS_LOCACAO.slice(13)];

  const assinaturas = [
    { nome: SACRA, papel: d.garantia === "garantia_investe" ? "Administradora" : "Representante Legal" },
    { nome: maiusc(d.locatario.nome), papel: "Locatário" },
  ];
  if (comFiador)
    d.fiadores.forEach((f, i) => {
      const n = d.fiadores.length > 1 ? ` ${i + 1}` : "";
      assinaturas.push({ nome: maiusc(f.nome), papel: `Fiador${n}` });
      if (f.conjuge) assinaturas.push({ nome: maiusc(f.conjuge.nome), papel: `Cônjuge do Fiador${n}` });
    });

  return {
    titulo: "CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL",
    quadros,
    preambulo: PREAMBULO_LOCACAO,
    clausulas,
    fecho: FECHO_LOCACAO,
    localData: `Brasília / DF, ${dataPorExtenso(d.dataAssinatura)}.`,
    assinaturas,
  };
}

export function montarCps(d: DadosCps): Documento {
  const beneficiarios: LinhaQuadro[] = [];
  const [a, b] = d.beneficiarios;
  const par = (rotulo: string, va: string, vb?: string): LinhaQuadro => (b ? [rotulo, ou(va), rotulo, ou(vb ?? "")] : [rotulo, ou(va)]);
  beneficiarios.push(par("Nome:", maiusc(a?.nome ?? ""), maiusc(b?.nome ?? "")));
  beneficiarios.push(par("CPF:", a?.cpf ?? "", b?.cpf));
  beneficiarios.push(par("Percentual:", a ? a.percentual || (b ? "" : "100%") : "", b?.percentual));
  beneficiarios.push(par("Banco:", a?.banco ?? "", b?.banco));
  beneficiarios.push(par("Agência / Conta:", a?.agenciaConta ?? "", b?.agenciaConta));
  beneficiarios.push(par("Chave PIX:", a?.pix ?? "", b?.pix));

  const marca = (m: ModalidadeCps) => `[${d.modalidade === m ? "X" : "  "}] ${MODALIDADES_CPS[m]}`;
  const localData = `Brasília/DF, ${dataPorExtenso(d.dataAssinatura)}.`;
  return {
    titulo: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ADMINISTRAÇÃO E INTERMEDIAÇÃO DE LOCAÇÃO",
    quadros: [
      { titulo: "CONTRATANTE", linhas: linhasPessoa(d.contratante) },
      {
        titulo: "CONTRATADA",
        linhas: [
          ["Nome:", SACRA],
          ["CNPJ:", "30.577.408/0001-91", "CRECI/J:", "24.788/DF"],
          ["Sede:", "EPTG Chácara 68, Loja 01, CEP N° 72005-350, Park Way Águas Claras, Brasília/DF"],
          ["Representante:", "AMANDA OLIVEIRA MARTINS, brasileira, casada, portadora do CRECI N° 14.502/DF, residente e domiciliada em Brasília/DF"],
        ],
      },
      quadroImovel(d.imovel, true),
      {
        titulo: "CONDIÇÕES COMERCIAIS",
        linhas: [
          ["Aluguel Inicial:", valorComExtenso(d.aluguelCentavos)],
          ["Modalidade:", `${marca("tradicional")}\n${marca("garantida")}`],
          ["Taxa de Intermediação:", "100% do primeiro aluguel efetivamente recebido a cada nova locação"],
        ],
      },
      { titulo: d.beneficiarios.length > 1 ? "BENEFICIÁRIOS" : "BENEFICIÁRIO", linhas: beneficiarios },
    ],
    preambulo: [PREAMBULO_CPS],
    clausulas: CLAUSULAS_CPS,
    fecho: FECHO_CPS,
    localData,
    assinaturas: [
      { nome: SACRA, papel: "Contratada" },
      { nome: maiusc(d.contratante.nome), papel: "Contratante" },
    ],
    anexo: { titulo: PROCURACAO_TITULO, secoes: PROCURACAO, localData, assinaturas: [{ nome: maiusc(d.contratante.nome), papel: "Outorgante" }] },
  };
}
