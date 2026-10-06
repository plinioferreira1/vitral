/**
 * Documento do Termo de Entrega de Chaves: formato dos dados, limpeza do
 * que vem da tela, situação/bloqueios, textos automáticos, retrato
 * (snapshot) da versão e descrição das alterações para a auditoria.
 * Funções puras, sem banco.
 */

import {
  CATEGORIAS,
  MARCOS,
  PAGADORES,
  REGRA_CALCULO,
  DESCRICAO_REGRA,
  RESPONSAVEIS,
  ROTULO_CATEGORIA,
  ROTULO_PAGADOR,
  ROTULO_RESPONSAVEL,
  ROTULO_TIPO_CALCULO,
  TIPOS_CALCULO,
  calcularAcerto,
  calcularEncargo,
  dataBR,
  dataValida,
  fraseAcerto,
  type Acerto,
  type EncargoCalculado,
  type EncargoEntrada,
  type Marco,
} from "./calculo";
import { formatarCentavos, inteiroPorExtenso, valorComExtenso } from "./extenso";

// ---------------------------------------------------------------
// situação
// ---------------------------------------------------------------

export const STATUS_TERMO = ["rascunho", "gerado", "aguardando_assinatura", "parcialmente_assinado", "assinado", "cancelado"] as const;
export type StatusTermo = (typeof STATUS_TERMO)[number];
export const ROTULO_STATUS: Record<StatusTermo, string> = {
  rascunho: "Rascunho",
  gerado: "Gerado",
  aguardando_assinatura: "Aguardando assinatura",
  parcialmente_assinado: "Parcialmente assinado",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

/** Filtros da listagem (o pedido agrupa "aguardando" e "parcialmente assinado"). */
export const FILTROS_STATUS = ["todos", "rascunho", "aguardando", "assinado", "cancelado"] as const;
export type FiltroStatus = (typeof FILTROS_STATUS)[number];
export const STATUS_DO_FILTRO: Record<FiltroStatus, StatusTermo[]> = {
  todos: [...STATUS_TERMO],
  rascunho: ["rascunho", "gerado"],
  aguardando: ["aguardando_assinatura", "parcialmente_assinado"],
  assinado: ["assinado"],
  cancelado: ["cancelado"],
};

/** Só o rascunho aceita edição de conteúdo. */
export function podeEditarConteudo(status: StatusTermo): boolean {
  return status === "rascunho";
}
/** Já recebeu alguma assinatura: nunca mais volta a rascunho; só nova versão. */
export function temAssinatura(status: StatusTermo): boolean {
  return status === "parcialmente_assinado" || status === "assinado";
}
/** Depois de gerado e antes de qualquer assinatura dá para voltar a editar a mesma versão. */
export function podeVoltarParaEdicao(status: StatusTermo): boolean {
  return status === "gerado" || status === "aguardando_assinatura";
}
export function podeCriarNovaVersao(status: StatusTermo): boolean {
  return temAssinatura(status);
}
export function podeEnviarParaAssinatura(status: StatusTermo): boolean {
  return status === "gerado";
}
export function podeCancelar(status: StatusTermo): boolean {
  return status !== "cancelado";
}

/** Situação do termo a partir das assinaturas da versão atual. */
export function statusPorAssinaturas(total: number, assinadas: number): StatusTermo {
  if (total > 0 && assinadas >= total) return "assinado";
  if (assinadas > 0) return "parcialmente_assinado";
  return "aguardando_assinatura";
}

// ---------------------------------------------------------------
// documento
// ---------------------------------------------------------------

export type PapelParte = "vendedor" | "comprador";
export type ParteTermo = { id: string; papel: PapelParte; nome: string; cpfCnpj: string; rg: string; email: string; clienteId: string | null };

export const STATUS_ENERGIA = ["", "transferencia_necessaria", "ja_transferida", "sem_ligacao_individual", "outro"] as const;
export const STATUS_AGUA_GAS = ["", "individual", "incluido_condominio", "transferencia_necessaria", "outro"] as const;
export const ROTULO_SERVICO: Record<string, string> = {
  "": "",
  transferencia_necessaria: "Transferência de titularidade necessária",
  ja_transferida: "Titularidade já transferida",
  sem_ligacao_individual: "Sem ligação individual",
  individual: "Individual",
  incluido_condominio: "Incluído no condomínio",
  outro: "Outro",
};
export type Servico = { status: string; observacao: string };

export const TIPOS_CONTA = ["", "corrente", "poupanca", "pagamento"] as const;
export const ROTULO_TIPO_CONTA: Record<string, string> = { "": "", corrente: "Conta corrente", poupanca: "Conta poupança", pagamento: "Conta de pagamento" };
export const TIPOS_PIX = ["", "cpf_cnpj", "email", "telefone", "aleatoria"] as const;
export const ROTULO_TIPO_PIX: Record<string, string> = { "": "", cpf_cnpj: "CPF/CNPJ", email: "E-MAIL", telefone: "TELEFONE", aleatoria: "CHAVE ALEATÓRIA" };

export type Ressarcimento = {
  /** id da parte escolhida, ou "outro" para beneficiário autorizado */
  beneficiario: string;
  nome: string;
  cpfCnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  chavePix: string;
  tipoChavePix: string;
};

export type Clausula = { texto: string; prazoDias: number; multaDiariaCentavos: number; observacoes: string; textoComplementar: string };

export type DocumentoTermo = {
  processoId: string | null;
  partes: ParteTermo[];
  imovel: { endereco: string; areaPrivativa: string; matricula: string; cartorio: string; inscricaoIptu: string; outros: string };
  dataEntrega: string | null;
  horaEntrega: string;
  marco: Marco;
  marcoData: string | null;
  encargos: EncargoEntrada[];
  demais: { energia: Servico; agua: Servico; gas: Servico };
  ressarcimento: Ressarcimento;
  clausula: Clausula;
  local: string;
  dataDocumento: string | null;
};

export const CLAUSULA_PADRAO =
  "No ato da entrega das chaves, o(s) COMPRADOR(ES) declara(m) ter recebido o imóvel no estado físico em que se encontra, afirmando, ainda, que o vistoriaram previamente e o aceitam nas condições atuais. Declaram também estar cientes de que deverão solicitar a transferência de titularidade dos serviços vinculados ao imóvel no prazo de até {{prazo_dias}} dias úteis, contados desta data, limitando-se sua obrigação a apresentar as solicitações cabíveis tão logo disponha da documentação necessária, sob pena de multa diária de {{multa_diaria}}.";

export const VARIAVEIS_CLAUSULA = ["{{prazo_dias}}", "{{multa_diaria}}", "{{data_entrega}}"] as const;

export type ModeloTermo = {
  clausulaPadrao: string;
  prazoTransferenciaDias: number;
  multaDiariaCentavos: number;
  observacoesPadrao: string;
  textoComplementar: string;
  cidade: string;
  /** caminho do papel timbrado enviado; vazio = timbrado padrão da Sacra */
  timbradoCaminho: string;
  margemSuperior: number;
  margemInferior: number;
};

export const MODELO_PADRAO: ModeloTermo = {
  clausulaPadrao: CLAUSULA_PADRAO,
  prazoTransferenciaDias: 10,
  multaDiariaCentavos: 10000,
  observacoesPadrao: "",
  textoComplementar: "",
  cidade: "Brasília – DF",
  timbradoCaminho: "",
  margemSuperior: 122,
  margemInferior: 104,
};

export function documentoVazio(modelo: ModeloTermo = MODELO_PADRAO): DocumentoTermo {
  return {
    processoId: null,
    partes: [],
    imovel: { endereco: "", areaPrivativa: "", matricula: "", cartorio: "", inscricaoIptu: "", outros: "" },
    dataEntrega: null,
    horaEntrega: "",
    marco: "entrega",
    marcoData: null,
    encargos: [],
    demais: { energia: { status: "", observacao: "" }, agua: { status: "", observacao: "" }, gas: { status: "", observacao: "" } },
    ressarcimento: { beneficiario: "", nome: "", cpfCnpj: "", banco: "", agencia: "", conta: "", tipoConta: "", chavePix: "", tipoChavePix: "" },
    clausula: {
      texto: modelo.clausulaPadrao,
      prazoDias: modelo.prazoTransferenciaDias,
      multaDiariaCentavos: modelo.multaDiariaCentavos,
      observacoes: modelo.observacoesPadrao,
      textoComplementar: modelo.textoComplementar,
    },
    local: modelo.cidade,
    dataDocumento: null,
  };
}

// ---------------------------------------------------------------
// limpeza do que vem da tela (nunca confiar no JSON recebido)
// ---------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txt = (v: unknown, limite: number) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v)).replace(/\u0000/g, "").trim().slice(0, limite);
const data = (v: unknown) => (typeof v === "string" && dataValida(v) ? v : null);
const centavos = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 99_999_999_999 ? n : 0;
};
const daLista = <T extends string>(lista: readonly T[], v: unknown, padrao: T): T => ((lista as readonly string[]).includes(String(v)) ? (String(v) as T) : padrao);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function normalizarDocumento(bruto: unknown, modelo: ModeloTermo = MODELO_PADRAO): DocumentoTermo {
  const b = obj(bruto);
  const base = documentoVazio(modelo);
  const idsVistos = new Set<string>();
  const idUnico = (v: unknown) => {
    const id = typeof v === "string" && UUID.test(v) && !idsVistos.has(v.toLowerCase()) ? v.toLowerCase() : null;
    if (id) idsVistos.add(id);
    return id;
  };

  const partes: ParteTermo[] = [];
  for (const p of Array.isArray(b.partes) ? b.partes.slice(0, 20) : []) {
    const o = obj(p);
    const id = idUnico(o.id);
    const nome = txt(o.nome, 200);
    if (!id || !nome) continue;
    partes.push({
      id,
      papel: o.papel === "comprador" ? "comprador" : "vendedor",
      nome,
      cpfCnpj: txt(o.cpfCnpj, 30),
      rg: txt(o.rg, 60),
      email: txt(o.email, 200).toLowerCase(),
      clienteId: typeof o.clienteId === "string" && UUID.test(o.clienteId) ? o.clienteId : null,
    });
  }

  const encargos: EncargoEntrada[] = [];
  for (const e of Array.isArray(b.encargos) ? b.encargos.slice(0, 60) : []) {
    const o = obj(e);
    const id = idUnico(o.id);
    if (!id) continue;
    const tipoCalculo = daLista(TIPOS_CALCULO, o.tipoCalculo, "proporcional_dias");
    let responsavel = daLista(RESPONSAVEIS, o.responsavel, "proporcional");
    if (tipoCalculo === "proporcional_dias") responsavel = "proporcional";
    if (tipoCalculo === "integral" && responsavel === "proporcional") responsavel = "vendedor";
    const categoria = daLista(CATEGORIAS, o.categoria, "outro");
    encargos.push({
      id,
      categoria,
      descricao: txt(o.descricao, 200) || ROTULO_CATEGORIA[categoria],
      competencia: txt(o.competencia, 40),
      periodoInicio: data(o.periodoInicio),
      periodoFim: data(o.periodoFim),
      vencimento: data(o.vencimento),
      valorTotalCentavos: centavos(o.valorTotalCentavos),
      pagoPor: daLista(PAGADORES, o.pagoPor, "vendedor"),
      responsavel,
      tipoCalculo,
      manualVendedorCentavos: centavos(o.manualVendedorCentavos),
      manualCompradorCentavos: centavos(o.manualCompradorCentavos),
      observacao: txt(o.observacao, 600),
    });
  }

  const im = obj(b.imovel);
  const dm = obj(b.demais);
  const servico = (v: unknown, lista: readonly string[]): Servico => {
    const o = obj(v);
    return { status: daLista(lista, o.status, ""), observacao: txt(o.observacao, 300) };
  };
  const rs = obj(b.ressarcimento);
  const cl = obj(b.clausula);
  const beneficiario = rs.beneficiario === "outro" ? "outro" : partes.some((p) => p.id === rs.beneficiario) ? String(rs.beneficiario) : "";
  const prazo = Math.round(Number(cl.prazoDias));

  return {
    processoId: typeof b.processoId === "string" && UUID.test(b.processoId) ? b.processoId : null,
    partes,
    imovel: {
      endereco: txt(im.endereco, 500),
      areaPrivativa: txt(im.areaPrivativa, 60),
      matricula: txt(im.matricula, 120),
      cartorio: txt(im.cartorio, 200),
      inscricaoIptu: txt(im.inscricaoIptu, 60),
      outros: txt(im.outros, 600),
    },
    dataEntrega: data(b.dataEntrega),
    horaEntrega: /^\d{2}:\d{2}$/.test(String(b.horaEntrega ?? "")) ? String(b.horaEntrega) : "",
    marco: daLista(MARCOS, b.marco, "entrega"),
    marcoData: data(b.marcoData),
    encargos,
    demais: { energia: servico(dm.energia, STATUS_ENERGIA), agua: servico(dm.agua, STATUS_AGUA_GAS), gas: servico(dm.gas, STATUS_AGUA_GAS) },
    ressarcimento: {
      beneficiario,
      nome: txt(rs.nome, 200),
      cpfCnpj: txt(rs.cpfCnpj, 30),
      banco: txt(rs.banco, 120),
      agencia: txt(rs.agencia, 30),
      conta: txt(rs.conta, 40),
      tipoConta: daLista(TIPOS_CONTA, rs.tipoConta, ""),
      chavePix: txt(rs.chavePix, 160),
      tipoChavePix: daLista(TIPOS_PIX, rs.tipoChavePix, ""),
    },
    clausula: {
      texto: txt(cl.texto, 6000) || base.clausula.texto,
      prazoDias: Number.isFinite(prazo) && prazo >= 0 && prazo <= 365 ? prazo : base.clausula.prazoDias,
      multaDiariaCentavos: cl.multaDiariaCentavos === undefined ? base.clausula.multaDiariaCentavos : centavos(cl.multaDiariaCentavos),
      observacoes: txt(cl.observacoes, 3000),
      textoComplementar: txt(cl.textoComplementar, 3000),
    },
    local: txt(b.local, 120) || base.local,
    dataDocumento: data(b.dataDocumento),
  };
}

/** Data a partir da qual a responsabilidade é do comprador. */
export function marcoEfetivo(doc: Pick<DocumentoTermo, "marco" | "marcoData" | "dataEntrega">): string | null {
  return doc.marco === "entrega" ? doc.dataEntrega : doc.marcoData;
}

// ---------------------------------------------------------------
// cálculo do documento e textos automáticos
// ---------------------------------------------------------------

export type DocumentoCalculado = { calculos: Record<string, EncargoCalculado>; acerto: Acerto };

export function calcularDocumento(doc: DocumentoTermo): DocumentoCalculado {
  const marco = marcoEfetivo(doc);
  const calculos: Record<string, EncargoCalculado> = {};
  for (const e of doc.encargos) calculos[e.id] = calcularEncargo(e, marco);
  return { calculos, acerto: calcularAcerto(Object.values(calculos)) };
}

export const vendedores = (doc: DocumentoTermo) => doc.partes.filter((p) => p.papel === "vendedor");
export const compradores = (doc: DocumentoTermo) => doc.partes.filter((p) => p.papel === "comprador");

/** Cláusula com as variáveis trocadas — número e extenso saem do mesmo valor. */
export function renderizarClausula(doc: DocumentoTermo): string {
  const c = doc.clausula;
  return c.texto
    .replace(/\{\{\s*prazo_dias\s*\}\}/gi, `${c.prazoDias} (${inteiroPorExtenso(c.prazoDias)})`)
    .replace(/\{\{\s*multa_diaria\s*\}\}/gi, valorComExtenso(c.multaDiariaCentavos))
    .replace(/\{\{\s*data_entrega\s*\}\}/gi, dataBR(doc.dataEntrega));
}

export function beneficiarioDoRessarcimento(doc: DocumentoTermo): { nome: string; cpfCnpj: string } {
  const r = doc.ressarcimento;
  const parte = doc.partes.find((p) => p.id === r.beneficiario);
  return parte ? { nome: parte.nome, cpfCnpj: parte.cpfCnpj } : { nome: r.nome, cpfCnpj: r.cpfCnpj };
}

/** "O reembolso de valores deverá ser transferido em nome de…" — só quando há saldo. */
export function textoRessarcimento(doc: DocumentoTermo, acerto: Acerto): string {
  if (!acerto.devedor) return "";
  const r = doc.ressarcimento;
  const { nome, cpfCnpj } = beneficiarioDoRessarcimento(doc);
  if (!nome) return "";
  const digitos = cpfCnpj.replace(/\D/g, "");
  const documento = cpfCnpj ? `, portador(a) do ${digitos.length > 11 ? "CNPJ" : "CPF"} N° ${cpfCnpj}` : "";
  const conta: string[] = [];
  if (r.banco) conta.push(`o Banco ${r.banco}`);
  if (r.agencia) conta.push(`Agência N° ${r.agencia}`);
  if (r.conta) conta.push(`${r.tipoConta ? `${ROTULO_TIPO_CONTA[r.tipoConta]} ` : "Conta "}N° ${r.conta}`);
  const pix = r.chavePix ? `Chave PIX${r.tipoChavePix ? ` – ${ROTULO_TIPO_PIX[r.tipoChavePix]}` : ""}: ${r.chavePix}` : "";
  const destino = [conta.length ? `para ${conta.join(", ")}` : "", pix].filter(Boolean).join(", ");
  return `O reembolso de valores deverá ser transferido em nome de ${nome.toUpperCase()}${documento}, através de TED ou PIX${destino ? ` ${destino}` : ""}.`;
}

/** Frase do resumo total no PDF, com o valor por extenso. */
export function textoResumo(doc: DocumentoTermo, acerto: Acerto): string {
  if (!acerto.devedor) return "Não há valores a ressarcir entre as partes.";
  const nV = vendedores(doc).length;
  const nC = compradores(doc).length;
  const devedor = acerto.devedor === "comprador" ? (nC > 1 ? "dos COMPRADORES" : "do COMPRADOR") : nV > 1 ? "dos VENDEDORES" : "do VENDEDOR";
  const credor = acerto.devedor === "comprador" ? (nV > 1 ? "aos VENDEDORES" : "ao VENDEDOR") : nC > 1 ? "aos COMPRADORES" : "ao COMPRADOR";
  return `Fica sob responsabilidade ${devedor} ressarcir ${credor} o montante de ${valorComExtenso(acerto.saldoCentavos)}.`;
}

/** Texto de cada serviço (energia, água, gás) como sai no PDF. */
export function textoServico(s: Servico): string {
  const status = s.status && s.status !== "outro" ? ROTULO_SERVICO[s.status].toUpperCase() : "";
  return [status, s.observacao].filter(Boolean).join(" — ");
}

/** O que impede gerar o documento definitivo. */
export function pendenciasParaGerar(doc: DocumentoTermo): string[] {
  const p: string[] = [];
  if (vendedores(doc).length === 0) p.push("Informe ao menos um vendedor.");
  if (compradores(doc).length === 0) p.push("Informe ao menos um comprador.");
  if (!doc.imovel.endereco) p.push("Informe o endereço do imóvel.");
  if (!doc.dataEntrega) p.push("Informe a data da entrega das chaves.");
  if (doc.marco !== "entrega" && !doc.marcoData) p.push("Informe a data do marco da proporcionalidade.");
  const { calculos, acerto } = calcularDocumento(doc);
  doc.encargos.forEach((e) => {
    for (const erro of calculos[e.id].erros) p.push(`${e.descricao}: ${erro}`);
  });
  if (acerto.devedor && !beneficiarioDoRessarcimento(doc).nome) p.push("Há saldo a ressarcir: informe o beneficiário e os dados bancários.");
  return p;
}

// ---------------------------------------------------------------
// retrato (snapshot) de uma versão gerada
// ---------------------------------------------------------------

export type Assinatura = { papel: PapelParte; nomeEsperado: string; nomeDigitado: string | null; imagem: string | null; assinadoEm: string | null; ip: string | null };

export type RetratoTermo = {
  codigo: string;
  versao: number;
  regra: string;
  descricaoRegra: string;
  documento: DocumentoTermo;
  calculos: Record<string, EncargoCalculado>;
  acerto: Acerto;
  textos: { clausula: string; ressarcimento: string; resumo: string; resultado: string };
  modelo: { timbradoCaminho: string; margemSuperior: number; margemInferior: number };
  geradoEm: string;
  geradoPorNome: string;
};

export function montarRetrato(doc: DocumentoTermo, meta: { codigo: string; versao: number; geradoEm: string; geradoPorNome: string; modelo: ModeloTermo }): RetratoTermo {
  const { calculos, acerto } = calcularDocumento(doc);
  return {
    codigo: meta.codigo,
    versao: meta.versao,
    regra: REGRA_CALCULO,
    descricaoRegra: DESCRICAO_REGRA,
    documento: doc,
    calculos,
    acerto,
    textos: {
      clausula: renderizarClausula(doc),
      ressarcimento: textoRessarcimento(doc, acerto),
      resumo: textoResumo(doc, acerto),
      resultado: fraseAcerto(acerto, { vendedores: vendedores(doc).length, compradores: compradores(doc).length }),
    },
    modelo: { timbradoCaminho: meta.modelo.timbradoCaminho, margemSuperior: meta.modelo.margemSuperior, margemInferior: meta.modelo.margemInferior },
    geradoEm: meta.geradoEm,
    geradoPorNome: meta.geradoPorNome,
  };
}

// ---------------------------------------------------------------
// auditoria: o que mudou entre duas gravações
// ---------------------------------------------------------------

export type Alteracao = { acao: string; descricao: string; anterior?: unknown; novo?: unknown };

export function descreverAlteracoes(antes: DocumentoTermo, depois: DocumentoTermo): Alteracao[] {
  const lista: Alteracao[] = [];
  const mapaAntes = new Map(antes.encargos.map((e) => [e.id, e]));
  const mapaDepois = new Map(depois.encargos.map((e) => [e.id, e]));

  for (const e of depois.encargos) {
    const a = mapaAntes.get(e.id);
    if (!a) {
      lista.push({ acao: "encargo_adicionado", descricao: `Encargo adicionado: ${e.descricao} (${formatarCentavos(e.valorTotalCentavos)}).`, novo: e });
      continue;
    }
    const mudancas: string[] = [];
    if (a.valorTotalCentavos !== e.valorTotalCentavos) mudancas.push(`valor de ${formatarCentavos(a.valorTotalCentavos)} para ${formatarCentavos(e.valorTotalCentavos)}`);
    if (a.manualVendedorCentavos !== e.manualVendedorCentavos || a.manualCompradorCentavos !== e.manualCompradorCentavos)
      mudancas.push(`valores manuais para vendedor ${formatarCentavos(e.manualVendedorCentavos)} / comprador ${formatarCentavos(e.manualCompradorCentavos)}`);
    if (a.periodoInicio !== e.periodoInicio || a.periodoFim !== e.periodoFim)
      mudancas.push(`período de ${dataBR(a.periodoInicio) || "—"}–${dataBR(a.periodoFim) || "—"} para ${dataBR(e.periodoInicio) || "—"}–${dataBR(e.periodoFim) || "—"}`);
    if (a.vencimento !== e.vencimento) mudancas.push(`vencimento para ${dataBR(e.vencimento) || "—"}`);
    if (a.pagoPor !== e.pagoPor) mudancas.push(`quem pagou de ${ROTULO_PAGADOR[a.pagoPor]} para ${ROTULO_PAGADOR[e.pagoPor]}`);
    if (a.responsavel !== e.responsavel) mudancas.push(`responsável de ${ROTULO_RESPONSAVEL[a.responsavel]} para ${ROTULO_RESPONSAVEL[e.responsavel]}`);
    if (a.tipoCalculo !== e.tipoCalculo) mudancas.push(`cálculo de ${ROTULO_TIPO_CALCULO[a.tipoCalculo]} para ${ROTULO_TIPO_CALCULO[e.tipoCalculo]}`);
    if (a.descricao !== e.descricao || a.categoria !== e.categoria || a.competencia !== e.competencia || a.observacao !== e.observacao) mudancas.push("descrição");
    if (mudancas.length) lista.push({ acao: "encargo_alterado", descricao: `Encargo "${e.descricao}" alterado: ${mudancas.join("; ")}.`, anterior: a, novo: e });
  }
  for (const a of antes.encargos) {
    if (!mapaDepois.has(a.id)) lista.push({ acao: "encargo_removido", descricao: `Encargo removido: ${a.descricao} (${formatarCentavos(a.valorTotalCentavos)}).`, anterior: a });
  }

  if (antes.dataEntrega !== depois.dataEntrega || antes.horaEntrega !== depois.horaEntrega)
    lista.push({ acao: "data_alterada", descricao: `Data da entrega alterada de ${dataBR(antes.dataEntrega) || "—"} para ${dataBR(depois.dataEntrega) || "—"}.`, anterior: antes.dataEntrega, novo: depois.dataEntrega });
  if (antes.marco !== depois.marco || antes.marcoData !== depois.marcoData)
    lista.push({ acao: "data_alterada", descricao: `Marco da proporcionalidade alterado para ${dataBR(marcoEfetivo(depois)) || "—"}.`, anterior: { marco: antes.marco, data: antes.marcoData }, novo: { marco: depois.marco, data: depois.marcoData } });

  const j = (v: unknown) => JSON.stringify(v);
  if (j(antes.partes) !== j(depois.partes)) lista.push({ acao: "partes_alteradas", descricao: "Vendedores/compradores alterados.", anterior: antes.partes, novo: depois.partes });
  if (j(antes.imovel) !== j(depois.imovel)) lista.push({ acao: "imovel_alterado", descricao: "Dados do imóvel alterados.", anterior: antes.imovel, novo: depois.imovel });
  if (j(antes.ressarcimento) !== j(depois.ressarcimento)) lista.push({ acao: "ressarcimento_alterado", descricao: "Dados para ressarcimento alterados.", anterior: antes.ressarcimento, novo: depois.ressarcimento });
  if (j(antes.demais) !== j(depois.demais)) lista.push({ acao: "demais_encargos_alterados", descricao: "Demais encargos e titularidades alterados.", anterior: antes.demais, novo: depois.demais });
  if (j(antes.clausula) !== j(depois.clausula) || antes.local !== depois.local || antes.dataDocumento !== depois.dataDocumento)
    lista.push({ acao: "clausula_alterada", descricao: "Cláusula, local ou data do documento alterados.", anterior: antes.clausula, novo: depois.clausula });
  return lista;
}

// ---------------------------------------------------------------
// permissões (nível + área, como no restante do Vitral)
// ---------------------------------------------------------------

export type PermissoesTermo = { ver: boolean; operar: boolean; configurar: boolean };

export function permissoesTermo(nivel: string, temVenda: boolean): PermissoesTermo {
  return {
    ver: temVenda && nivel !== "corretor" && nivel !== "social_media",
    operar: temVenda && !["auxiliar", "corretor", "social_media"].includes(nivel),
    configurar: nivel === "diretor" || nivel === "gerente",
  };
}
