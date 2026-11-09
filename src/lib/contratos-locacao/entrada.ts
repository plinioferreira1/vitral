/**
 * Converte o JSON enviado pela tela nos dados do contrato, com tamanhos
 * limitados e tipos garantidos. O servidor sempre passa por aqui antes de
 * validar e montar o PDF.
 */
import { GARANTIAS, MODALIDADES_CPS, type Beneficiario, type Conjuge, type DadosCps, type DadosLocacao, type Fiador, type Imovel, type Pessoa } from "./montar";

type Bruto = Record<string, unknown>;
const obj = (v: unknown): Bruto => (v && typeof v === "object" && !Array.isArray(v) ? (v as Bruto) : {});
const txt = (v: unknown, max = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const inteiro = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
const data = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

function pessoa(v: unknown): Pessoa {
  const o = obj(v);
  return {
    nome: txt(o.nome, 200),
    nacionalidade: txt(o.nacionalidade, 60),
    profissao: txt(o.profissao, 120),
    cpf: txt(o.cpf, 20),
    rg: txt(o.rg, 40),
    email: txt(o.email, 254),
    estadoCivil: txt(o.estadoCivil, 60),
    endereco: txt(o.endereco, 400),
  };
}

function conjuge(v: unknown): Conjuge | null {
  if (!v) return null;
  const o = obj(v);
  return { nome: txt(o.nome, 200), cpf: txt(o.cpf, 20), rg: txt(o.rg, 40), nacionalidade: txt(o.nacionalidade, 60), profissao: txt(o.profissao, 120), email: txt(o.email, 254) };
}

function imovel(v: unknown): Imovel {
  const o = obj(v);
  return {
    endereco: txt(o.endereco, 400),
    areaPrivativa: txt(o.areaPrivativa, 60),
    matricula: txt(o.matricula, 60),
    cartorio: txt(o.cartorio, 120),
    inscricaoIptu: txt(o.inscricaoIptu, 60),
    vagaGaragem: txt(o.vagaGaragem, 200),
    composicao: txt(o.composicao, 600),
  };
}

export function lerLocacao(v: unknown): DadosLocacao {
  const o = obj(v);
  const garantia = String(o.garantia ?? "");
  const fiadores = (Array.isArray(o.fiadores) ? o.fiadores.slice(0, 2) : []).map((f): Fiador => ({ ...pessoa(f), conjuge: conjuge(obj(f).conjuge) }));
  const loc = obj(o.locador);
  return {
    locador: { nome: txt(loc.nome, 200), cpf: txt(loc.cpf, 20), endereco: txt(loc.endereco, 400) },
    locatario: pessoa(o.locatario),
    fiadores,
    imovel: imovel(o.imovel),
    garantia: (garantia in GARANTIAS ? garantia : "fiador") as DadosLocacao["garantia"],
    tituloValorCentavos: inteiro(o.tituloValorCentavos) || 0,
    tituloProposta: txt(o.tituloProposta, 60),
    prazoMeses: inteiro(o.prazoMeses),
    inicio: data(o.inicio),
    aluguelCentavos: inteiro(o.aluguelCentavos),
    diaVencimento: inteiro(o.diaVencimento),
    primeiroVencimento: data(o.primeiroVencimento),
    primeiroPeriodoInicio: data(o.primeiroPeriodoInicio),
    primeiroPeriodoFim: data(o.primeiroPeriodoFim),
    descontoCentavos: inteiro(o.descontoCentavos) || 0,
    diaLimiteDesconto: inteiro(o.diaLimiteDesconto),
    dataAssinatura: data(o.dataAssinatura),
  };
}

export function lerCps(v: unknown): DadosCps {
  const o = obj(v);
  const modalidade = String(o.modalidade ?? "");
  const beneficiarios = (Array.isArray(o.beneficiarios) ? o.beneficiarios.slice(0, 2) : []).map((b): Beneficiario => {
    const x = obj(b);
    return { nome: txt(x.nome, 200), cpf: txt(x.cpf, 20), percentual: txt(x.percentual, 10), banco: txt(x.banco, 80), agenciaConta: txt(x.agenciaConta, 60), pix: txt(x.pix, 120) };
  });
  return {
    contratante: pessoa(o.contratante),
    imovel: imovel(o.imovel),
    aluguelCentavos: inteiro(o.aluguelCentavos),
    modalidade: (modalidade in MODALIDADES_CPS ? modalidade : "") as DadosCps["modalidade"],
    beneficiarios,
    dataAssinatura: data(o.dataAssinatura),
  };
}
