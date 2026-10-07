/**
 * Ficha cadastral de locação — definição única dos campos, das regras de
 * obrigatoriedade, da lista de documentos e dos textos da declaração.
 * O formulário público, a tela interna e o PDF leem daqui, e o servidor
 * usa as mesmas regras para conferir antes de gravar.
 */

import { moedaParaNumero } from "../moeda";

export type DadosFicha = Record<string, string | number | boolean | null>;

export const TIPOS_LOCATARIO = ["titular", "corresponsavel", "fiador"] as const;
export type TipoLocatario = (typeof TIPOS_LOCATARIO)[number];
export const ROTULO_TIPO: Record<TipoLocatario, string> = { titular: "Titular", corresponsavel: "Corresponsável", fiador: "Fiador" };

export function tipoLocatario(valor: unknown, padrao: TipoLocatario = "titular"): TipoLocatario {
  return (TIPOS_LOCATARIO as readonly string[]).includes(String(valor)) ? (valor as TipoLocatario) : padrao;
}

export type FormatoCampo = "texto" | "longo" | "data" | "moeda" | "cpf" | "telefone" | "cep" | "email" | "lista";
type Regra = (d: DadosFicha, tipo: TipoLocatario) => boolean;

export type Campo = {
  chave: string;
  rotulo: string;
  formato?: FormatoCampo;
  opcoes?: readonly string[];
  obrigatorio?: boolean | Regra;
  /** quando ausente, o campo aparece sempre */
  visivel?: Regra;
  /** ocupa a linha inteira */
  larga?: boolean;
  ajuda?: string;
};

export type Secao = { id: string; titulo: string; etapa: number; campos: Campo[]; descricao?: string; visivel?: Regra };

export const ETAPAS = ["Proposta", "Dados pessoais", "Renda", "Bens e referências", "Documentos", "Conferência e assinatura"] as const;
export const ETAPA_DOCUMENTOS = 4;
export const ETAPA_DECLARACAO = 5;

export const GARANTIAS = [
  { nome: "Seguro Fiança", itens: ["É necessário possuir um cartão de crédito com limite mínimo de 3 vezes o valor do aluguel.", "Taxa de adesão de R$ 150,00, podendo ser parcelada em 2 ou 3 vezes.", "O valor da garantia é a partir de 11% do pacote mensal de locação (aluguel + condomínio + demais encargos aplicáveis), multiplicado por 12 meses.", "A garantia deve ser renovada anualmente, enquanto durar o contrato.", "Não há reembolso ao locatário ao final da locação."], obs: "A taxa de 11% é a mínima. O cliente passa por análise interna da seguradora, que pode oferecer apenas taxas maiores, conforme o risco avaliado — esse processo é interno e não temos como interferir." },
  { nome: "Título de Capitalização", itens: ["Contratação de um título de capitalização com valor entre 6 e 10 vezes o pacote mensal de locação, a depender da análise da seguradora.", "O valor aplicado rende pela TR e pode ser resgatado a qualquer momento, podendo haver deságio caso o resgate ocorra antes de 12 meses.", "Pagamento à vista ou parcelado em até 18 vezes, com juros. Os juros do parcelamento não são reembolsáveis ao final da locação.", "Ao final da locação, o cliente pode resgatar integralmente o valor aplicado, acrescido dos rendimentos."] },
  { nome: "Garantia Investe", itens: ["Investimento de um valor entre 6 e 10 vezes o pacote mensal de locação numa corretora de investimento, a Warren, a depender da análise da seguradora.", "O valor aplicado rende pela SELIC e pode ser resgatado a qualquer momento, podendo haver deságio caso o resgate seja feito antes de 12 meses.", "Ao final da locação, o cliente pode resgatar integralmente o valor aplicado, acrescido dos rendimentos, ou manter o valor aplicado, com total autonomia da sua conta de investimentos."] },
  { nome: "Fiador", itens: ["O fiador preenche e assina a própria ficha cadastral, por um link que a SACRA envia.", "Deve comprovar renda suficiente e apresentar documentação pessoal e financeira.", "Para fiador com imóvel quitado: escritura do imóvel acompanhada da certidão de ônus com até 30 dias de emissão."], obs: "O fiador também passa por análise cadastral. A indicação não garante aprovação." },
] as const;

const OPCOES_GARANTIA = [...GARANTIAS.map((g) => g.nome), "A definir"];
const CASADO = ["Casado(a)", "União estável"];
const COM_EMPRESA = ["Assalariado(a)", "Empresário(a)"];

const titular: Regra = (_d, tipo) => tipo === "titular";
const texto = (d: DadosFicha, chave: string) => String(d[chave] ?? "").trim();
const casado: Regra = (d) => CASADO.includes(texto(d, "estado_civil"));
const comEmpresa: Regra = (d) => COM_EMPRESA.includes(texto(d, "tipo_renda"));
const temImovel: Regra = (d) => texto(d, "imovel_proprio").startsWith("Sim");
const imovelFinanciado: Regra = (d) => texto(d, "imovel_proprio") === "Sim — financiado";
const temVeiculo: Regra = (d) => texto(d, "veiculo") !== "";
const veiculoFinanciado: Regra = (d) => temVeiculo(d, "titular") && texto(d, "veiculo_financiado") === "Sim";
const garantiaFiador: Regra = (d, tipo) => tipo === "titular" && texto(d, "garantia") === "Fiador";
const comCorresponsavel: Regra = (d, tipo) => tipo === "titular" && texto(d, "tem_corresponsavel") === "Sim";
const moradiaPaga: Regra = (d) => ["Alugado", "Próprio financiado"].includes(texto(d, "moradia_tipo"));

export const SECOES: Secao[] = [
  {
    id: "proposta", titulo: "Informações do imóvel pretendido e contrato", etapa: 0, visivel: titular,
    campos: [
      { chave: "imovel_interesse", rotulo: "Identificação do imóvel", obrigatorio: true, larga: true, ajuda: "Caso não saiba o endereço completo, basta colocar o condomínio." },
      { chave: "valor_proposta", rotulo: "Valor da proposta", formato: "moeda", obrigatorio: true, ajuda: "Valor que deseja propor no aluguel pretendido." },
      { chave: "finalidade", rotulo: "Finalidade", formato: "lista", opcoes: ["Residencial", "Comercial"], obrigatorio: true },
      { chave: "garantia", rotulo: "Garantia escolhida", formato: "lista", opcoes: OPCOES_GARANTIA, obrigatorio: true, ajuda: "Escolha a garantia com a qual você tem prioridade de seguir." },
      { chave: "data_pretendida", rotulo: "Data pretendida para início", formato: "data" },
      { chave: "moradores", rotulo: "Quantas pessoas ocuparão o imóvel?" },
      { chave: "possui_pet", rotulo: "Possui animais?", formato: "lista", opcoes: ["Não", "Sim — pequeno porte", "Sim — médio/grande porte"] },
    ],
  },
  {
    id: "fiador_indicado", titulo: "Fiador indicado", etapa: 0, visivel: garantiaFiador,
    descricao: "Informe apenas o contato. O fiador receberá um link para preencher e assinar a própria ficha.",
    campos: [
      { chave: "fiador_nome", rotulo: "Nome completo do fiador", obrigatorio: true, larga: true },
      { chave: "fiador_telefone", rotulo: "Telefone / WhatsApp do fiador", formato: "telefone", obrigatorio: true },
      { chave: "fiador_email", rotulo: "E-mail do fiador", formato: "email" },
    ],
  },
  {
    id: "corresponsavel_indicado", titulo: "Corresponsável", etapa: 0, visivel: titular,
    descricao: "Outra pessoa que também assinará o contrato como locatária, somando renda com você.",
    campos: [
      { chave: "tem_corresponsavel", rotulo: "Haverá corresponsável na locação?", formato: "lista", opcoes: ["Não", "Sim"] },
      { chave: "corresponsavel_nome", rotulo: "Nome completo do corresponsável", obrigatorio: true, visivel: comCorresponsavel },
      { chave: "corresponsavel_telefone", rotulo: "Telefone / WhatsApp do corresponsável", formato: "telefone", obrigatorio: true, visivel: comCorresponsavel },
      { chave: "corresponsavel_email", rotulo: "E-mail do corresponsável", formato: "email", visivel: comCorresponsavel },
    ],
  },
  {
    id: "pessoais", titulo: "Dados pessoais", etapa: 1, descricao: "Preencha exatamente como consta nos documentos.",
    campos: [
      { chave: "nome_completo", rotulo: "Nome completo", obrigatorio: true, larga: true },
      { chave: "cpf", rotulo: "CPF", formato: "cpf", obrigatorio: true },
      { chave: "rg", rotulo: "RG e órgão emissor", obrigatorio: true, ajuda: "Ex.: 000000 SSP/DF" },
      { chave: "nascimento", rotulo: "Data de nascimento", formato: "data", obrigatorio: true },
      { chave: "nacionalidade", rotulo: "Nacionalidade", obrigatorio: true },
      { chave: "naturalidade", rotulo: "Cidade de nascimento e UF", obrigatorio: true, ajuda: "Ex.: Salvador/BA" },
      { chave: "estado_civil", rotulo: "Estado civil", formato: "lista", opcoes: ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"], obrigatorio: true },
      { chave: "dependentes", rotulo: "Dependentes", formato: "lista", opcoes: ["Nenhum", "1", "2", "3", "4 ou mais"], obrigatorio: true, ajuda: "De acordo com a declaração de imposto de renda." },
      { chave: "filiacao", rotulo: "Filiação", formato: "longo", obrigatorio: true, larga: true, ajuda: "Nome dos seus pais, conforme aplicável." },
      { chave: "telefone", rotulo: "Telefone / WhatsApp", formato: "telefone", obrigatorio: true },
      { chave: "email", rotulo: "E-mail", formato: "email", obrigatorio: true },
    ],
  },
  {
    id: "conjuge", titulo: "Dados do cônjuge", etapa: 1, visivel: casado,
    campos: [
      { chave: "conjuge_nome", rotulo: "Nome completo do cônjuge", obrigatorio: true },
      { chave: "conjuge_cpf", rotulo: "CPF do cônjuge", formato: "cpf", obrigatorio: true },
    ],
  },
  {
    id: "moradia", titulo: "Endereço residencial atual", etapa: 1,
    campos: [
      { chave: "endereco", rotulo: "Endereço", obrigatorio: true, larga: true },
      { chave: "complemento", rotulo: "Complemento" },
      { chave: "cep", rotulo: "CEP", formato: "cep", obrigatorio: true },
      { chave: "cidade", rotulo: "Cidade", obrigatorio: true },
      { chave: "uf", rotulo: "Estado (UF)", obrigatorio: true },
      { chave: "moradia_tipo", rotulo: "Tipo de imóvel onde mora", formato: "lista", opcoes: ["Próprio quitado", "Próprio financiado", "Alugado", "Cedido / de familiares", "Funcional", "Outro"], obrigatorio: true },
      { chave: "moradia_valor", rotulo: "Valor do aluguel / prestação", formato: "moeda", visivel: moradiaPaga },
    ],
  },
  {
    id: "renda", titulo: "Atividades e rendas", etapa: 2, descricao: "Informações utilizadas exclusivamente na análise cadastral.",
    campos: [
      { chave: "tipo_renda", rotulo: "Tipo de renda", formato: "lista", opcoes: ["Assalariado(a)", "Empresário(a)", "Autônomo(a)", "Aposentado(a)", "Pensionista"], obrigatorio: true },
      { chave: "profissao", rotulo: "Profissão", obrigatorio: true },
      { chave: "empresa", rotulo: "Empresa / origem da renda", obrigatorio: true, larga: true },
      { chave: "cargo", rotulo: "Cargo exercido", obrigatorio: comEmpresa },
      { chave: "data_admissao", rotulo: "Data de admissão / início da atividade", formato: "data", obrigatorio: (d) => texto(d, "tipo_renda") === "Assalariado(a)" },
      { chave: "empresa_endereco", rotulo: "Endereço da empresa", obrigatorio: comEmpresa, larga: true, ajuda: "Rua, número, complemento, cidade/UF e CEP." },
      { chave: "empresa_telefone", rotulo: "Telefone da empresa", formato: "telefone", obrigatorio: comEmpresa },
      { chave: "renda_mensal", rotulo: "Renda mensal (líquida)", formato: "moeda", obrigatorio: true },
      { chave: "outros_rendimentos", rotulo: "Outros rendimentos", formato: "moeda", ajuda: "Apenas se houver. Ex.: aluguel." },
      { chave: "outros_rendimentos_origem", rotulo: "Origem dos outros rendimentos", obrigatorio: (d) => texto(d, "outros_rendimentos") !== "" },
    ],
  },
  {
    id: "bens_imoveis", titulo: "Bens imóveis", etapa: 3, descricao: "Anexe a certidão de ônus do imóvel na etapa de documentos, caso se aplique.",
    campos: [
      { chave: "imovel_proprio", rotulo: "Possui imóvel?", formato: "lista", opcoes: ["Não", "Sim — quitado", "Sim — financiado"], obrigatorio: (_d, tipo) => tipo === "fiador" },
      { chave: "bem_imovel_valor", rotulo: "Valor do imóvel", formato: "moeda", visivel: temImovel },
      { chave: "bem_imovel_endereco", rotulo: "Endereço do imóvel", larga: true, visivel: temImovel, obrigatorio: (d, tipo) => tipo === "fiador" && temImovel(d, tipo), ajuda: "Endereço, complemento, cidade/UF e CEP." },
      { chave: "bem_imovel_prestacao", rotulo: "Valor da prestação", formato: "moeda", visivel: imovelFinanciado },
    ],
  },
  {
    id: "bens_moveis", titulo: "Bens móveis", etapa: 3,
    campos: [
      { chave: "veiculo", rotulo: "Veículo (marca, modelo e ano)" },
      { chave: "veiculo_valor", rotulo: "Valor do veículo", formato: "moeda", visivel: temVeiculo },
      { chave: "veiculo_financiado", rotulo: "Financiamento ativo?", formato: "lista", opcoes: ["Não", "Sim"], visivel: temVeiculo },
      { chave: "veiculo_prestacao", rotulo: "Valor da prestação", formato: "moeda", visivel: veiculoFinanciado },
    ],
  },
  {
    id: "banco", titulo: "Referências bancárias", etapa: 3,
    campos: [
      { chave: "banco", rotulo: "Banco", obrigatorio: true },
      { chave: "agencia", rotulo: "Agência", obrigatorio: true },
      { chave: "conta_abertura", rotulo: "Data de abertura da conta", ajuda: "Pode ser aproximada. Ex.: 03/2015." },
      { chave: "agencia_cidade", rotulo: "Cidade da agência", obrigatorio: true },
    ],
  },
  {
    id: "ref_pessoal", titulo: "Referência pessoal", etapa: 3,
    campos: [
      { chave: "referencia_nome", rotulo: "Nome completo", obrigatorio: true },
      { chave: "referencia_parentesco", rotulo: "Parentesco", obrigatorio: true, ajuda: "Parentesco ou relação com a sua referência." },
      { chave: "referencia_telefone", rotulo: "Telefone / WhatsApp", formato: "telefone", obrigatorio: true },
      { chave: "referencia_endereco", rotulo: "Endereço", larga: true },
    ],
  },
  {
    id: "ref_imobiliaria", titulo: "Referência imobiliária", etapa: 3, descricao: "Imobiliária pela qual você já alugou, se houver.",
    campos: [
      { chave: "ref_imobiliaria_nome", rotulo: "Nome da imobiliária" },
      { chave: "ref_imobiliaria_cidade", rotulo: "Cidade da imobiliária" },
      { chave: "ref_imobiliaria_telefone", rotulo: "Telefone / WhatsApp", formato: "telefone" },
    ],
  },
  {
    id: "dispensa_ir", titulo: "Documento não aplicável", etapa: 4,
    descricao: "Se você não apresenta declaração de imposto de renda, explique o motivo. A equipe conferirá essa informação na análise.",
    campos: [{ chave: "ir_nao_aplicavel", rotulo: "Motivo para não apresentar imposto de renda", formato: "longo", larga: true }],
  },
  {
    id: "observacoes", titulo: "Observações", etapa: 3,
    campos: [{ chave: "observacoes", rotulo: "Observações", formato: "longo", larga: true }],
  },
];

const CHAVES = new Map(SECOES.flatMap((s) => s.campos.map((c) => [c.chave, c] as const)));

const visivel = (s: Secao, c: Campo, d: DadosFicha, tipo: TipoLocatario) => (s.visivel ? s.visivel(d, tipo) : true) && (c.visivel ? c.visivel(d, tipo) : true);
const obrigatorio = (c: Campo, d: DadosFicha, tipo: TipoLocatario) => (typeof c.obrigatorio === "function" ? c.obrigatorio(d, tipo) : !!c.obrigatorio);

export type CampoVisivel = Campo & { exigido: boolean };

/** Seções e campos que esta pessoa enxerga, já com a obrigatoriedade resolvida. */
export function secoesVisiveis(d: DadosFicha, tipo: TipoLocatario, etapa?: number): (Omit<Secao, "campos"> & { campos: CampoVisivel[] })[] {
  return SECOES.filter((s) => etapa === undefined || s.etapa === etapa)
    .map((s) => ({ ...s, campos: s.campos.filter((c) => visivel(s, c, d, tipo)).map((c) => ({ ...c, exigido: obrigatorio(c, d, tipo) })) }))
    .filter((s) => s.campos.length > 0);
}

const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export function cpfValido(valor: unknown): boolean {
  const d = digitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export type Pendencia = { chave: string; rotulo: string; etapa: number; motivo: "faltando" | "invalido" };

/** O que falta ou está inválido — na ficha inteira ou só numa etapa. */
export function pendencias(d: DadosFicha, tipo: TipoLocatario, etapa?: number): Pendencia[] {
  const lista: Pendencia[] = [];
  for (const s of secoesVisiveis(d, tipo, etapa)) {
    for (const c of s.campos) {
      const valor = texto(d, c.chave);
      if (!valor) {
        if (c.exigido) lista.push({ chave: c.chave, rotulo: c.rotulo, etapa: s.etapa, motivo: "faltando" });
        continue;
      }
      const invalido =
        (c.formato === "cpf" && !cpfValido(valor)) ||
        (c.formato === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) ||
        (c.formato === "telefone" && digitos(valor).length < 10) ||
        (c.formato === "cep" && digitos(valor).length !== 8) ||
        (c.formato === "data" && (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(Date.parse(valor)) || new Date(valor).toISOString().slice(0, 10) !== valor)) ||
        (c.formato === "moeda" && moedaParaNumero(valor) <= 0) ||
        (c.formato === "lista" && !c.opcoes?.includes(valor));
      if (invalido) lista.push({ chave: c.chave, rotulo: c.rotulo, etapa: s.etapa, motivo: "invalido" });
    }
  }
  return lista;
}

export function textoPendencias(lista: Pendencia[]): string {
  const faltando = lista.filter((p) => p.motivo === "faltando").map((p) => p.rotulo);
  const invalidos = lista.filter((p) => p.motivo === "invalido").map((p) => p.rotulo);
  return [faltando.length ? `Preencha: ${faltando.join(", ")}.` : "", invalidos.length ? `Confira: ${invalidos.join(", ")}.` : ""].filter(Boolean).join(" ");
}

/**
 * Mantém só os campos que a ficha conhece e que esta pessoa enxerga, como
 * texto e com tamanho limitado. É o que o servidor grava — nada além disso
 * (por exemplo, número de conta bancária não é guardado).
 */
export function limparDados(d: DadosFicha, tipo: TipoLocatario): DadosFicha {
  const limpo: DadosFicha = {};
  for (const s of secoesVisiveis(d, tipo)) {
    for (const c of s.campos) {
      const valor = texto(d, c.chave);
      if (valor) limpo[c.chave] = valor.slice(0, c.formato === "longo" ? 2000 : 300);
    }
  }
  if (d.consentimento_lgpd === true) limpo.consentimento_lgpd = true;
  return limpo;
}

export const rotuloDoCampo = (chave: string) => CHAVES.get(chave)?.rotulo ?? chave.replaceAll("_", " ");

export function dataBR(valor: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor ?? "");
}

/** Valor como aparece na tela interna e no PDF. */
export const valorExibido = (c: Campo, d: DadosFicha) => (c.formato === "data" ? dataBR(d[c.chave]) : texto(d, c.chave));

// ---------------------------------------------------------------------------
// documentos
// ---------------------------------------------------------------------------

export const LIMITE_ARQUIVOS = 10;

export const DOCUMENTACAO_NECESSARIA = [
  "CPF e RG (se casado, também do cônjuge)",
  "Certidão de nascimento, casamento ou averbação de divórcio, conforme o caso",
  "Comprovante de residência atualizado (água, luz, telefone ou cartão de crédito)",
  "3 últimos comprovantes de renda (contracheque ou extrato bancário)",
  "Imposto de renda e recibo de declaração",
  "Última fatura do cartão de crédito comprovando o limite disponível (apenas Seguro Fiança)",
  "6 últimos contracheques (apenas Título de Capitalização e Garantia Investe)",
  "6 últimas movimentações bancárias (apenas Título de Capitalização e Garantia Investe)",
] as const;

export const DOCUMENTACAO_POR_OCUPACAO = [
  ["Empresário", "contrato social e alterações contratuais, extratos bancários da conta PJ, declaração de IR completa da empresa ou individual, pró-labore e DECORE originais emitidos pelo contador"],
  ["Pensionista", "extrato da conta corrente, crédito da pensão e contracheque"],
  ["Aposentado", "extrato da conta corrente, crédito do INSS e comprovante do benefício"],
  ["Fiador com imóvel quitado", "escritura do imóvel acompanhada da certidão de ônus com até 30 dias de emissão"],
] as const;

/** Tipos de anexo oferecidos, conforme a pessoa, a garantia e a renda. */
export function anexosDe(tipo: TipoLocatario, garantia: string, d: DadosFicha): string[] {
  const lista = ["Documento de identidade (CPF e RG)", "Certidão de estado civil", "Comprovante de residência", "Comprovantes de renda — 3 últimos", "Imposto de renda e recibo"];
  if (tipo !== "fiador" && ["Título de Capitalização", "Garantia Investe"].includes(garantia)) lista.splice(lista.indexOf("Comprovantes de renda — 3 últimos"), 1);
  if (casado(d, tipo)) lista.push("CPF e RG do cônjuge");
  if (tipo !== "fiador" && garantia === "Seguro Fiança") lista.push("Última fatura do cartão de crédito");
  if (tipo !== "fiador" && ["Título de Capitalização", "Garantia Investe"].includes(garantia)) lista.push("6 últimos contracheques", "6 últimas movimentações bancárias");
  if (tipo === "fiador" && temImovel(d, tipo)) lista.push("Escritura e certidão de ônus do imóvel");
  if (texto(d, "tipo_renda") === "Empresário(a)") lista.push("Contrato social, extratos PJ, pró-labore e DECORE");
  if (["Aposentado(a)", "Pensionista"].includes(texto(d, "tipo_renda"))) lista.push("Extrato e comprovante do benefício");
  lista.push("Outros documentos");
  return lista;
}

// ---------------------------------------------------------------------------
// declaração (texto da ficha cadastral da SACRA)
// ---------------------------------------------------------------------------

export type BlocoDeclaracao = { titulo: string; paragrafos: { destaque?: string; texto: string }[] };

export const DECLARACAO: BlocoDeclaracao[] = [
  {
    titulo: "Declaração de conformidade com a Lei Geral de Proteção de Dados — Lei nº 13.709/2018 (LGPD)",
    paragrafos: [
      { texto: "A SACRA SOLUÇÕES IMOBILIÁRIAS, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 30.577.408/0001-91, com sede na EPTG Chácara 68 – Loja 01 – Brasília/DF, detentora da marca SACRA IMÓVEIS, por meio deste instrumento declara estar em conformidade com a Lei Geral de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018, com alterações da Lei nº 13.853/2019), comprometendo-se a zelar pela privacidade e pela proteção dos dados pessoais de seus clientes, nos seguintes termos:" },
      { destaque: "Cláusula 1ª:", texto: "A empresa rege-se pelos princípios da legalidade, transparência, finalidade, adequação, necessidade, livre acesso, qualidade dos dados, segurança, prevenção, não discriminação e responsabilização, assumindo o compromisso de utilizar os dados pessoais dos clientes exclusivamente para os fins legítimos relacionados à sua atividade comercial." },
      { destaque: "Cláusula 2ª:", texto: "Os dados pessoais coletados são utilizados exclusivamente para a finalidade que motivou sua coleta. É vedado qualquer uso diverso do originalmente autorizado, sendo garantido o sigilo e confidencialidade das informações." },
      { destaque: "Cláusula 3ª:", texto: "Os dados obtidos durante eventual análise cadastral não serão compartilhados com terceiros e serão eliminados assim que atingida a finalidade para a qual foram coletados, conforme previsto na LGPD." },
      { destaque: "Cláusula 4ª:", texto: "O tratamento dos dados pessoais depende do consentimento livre, informado e inequívoco do titular, sendo assegurado o respeito à privacidade e aos direitos fundamentais do indivíduo." },
      { destaque: "Cláusula 5ª:", texto: "O compartilhamento de dados pessoais com terceiros é estritamente proibido, salvo quando imprescindível à execução do contrato de locação, hipótese em que o titular será previamente informado e sua autorização expressamente requerida, conforme dispõe a LGPD." },
      { destaque: "Cláusula 6ª:", texto: "Nos termos da legislação vigente, a SACRA IMÓVEIS indica como responsável técnico pelo tratamento de dados a Sra. Amanda Oliveira Martins, proprietária da empresa." },
    ],
  },
  {
    titulo: "Autorização para compartilhamento de dados pessoais",
    paragrafos: [
      { texto: "Na condição de proponente à locação, autorizo expressamente a empresa SACRA IMÓVEIS a compartilhar meus dados pessoais e documentação com as partes envolvidas no processo de locação do imóvel, incluindo a imobiliária, corretores autônomos e demais agentes necessários. Reconheço que tal compartilhamento é indispensável à análise e execução do contrato, conforme disposto na Cláusula 5 acima." },
    ],
  },
  {
    titulo: "Informações complementares",
    paragrafos: [
      { destaque: "1. Pessoa Jurídica:", texto: "Não serão realizados contratos de locação residencial em nome de pessoa jurídica." },
      { destaque: "2. Serviços Públicos:", texto: "Todos os imóveis encontram-se com os serviços de energia elétrica, água e gás desligados, sendo de inteira responsabilidade do novo locatário providenciar o pedido de religamento junto às concessionárias competentes." },
      { destaque: "3. Aprovação de Cadastro:", texto: "A devolução deste formulário, devidamente preenchido e assinado, não garante direito de preferência ao(s) proponente(s) locatário(s), cabendo exclusivamente à SACRA IMÓVEIS a aprovação ou recusa do cadastro, sem necessidade de justificativa." },
      { destaque: "4. Preenchimento Obrigatório:", texto: "É indispensável o preenchimento completo deste formulário, bem como a assinatura do proponente, sob pena de devolução e não continuidade da análise." },
    ],
  },
];

export const ACEITE = "Aceito e declaro, sob as penas da lei, serem verdadeiras todas as informações constantes desta ficha de cadastro.";
