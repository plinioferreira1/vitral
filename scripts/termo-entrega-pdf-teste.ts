/**
 * Gera PDFs de TESTE do Termo de Entrega de Chaves com dados FICTÍCIOS,
 * sem tocar no banco. Serve para revisar o layout no papel timbrado.
 *
 *   npx tsx scripts/termo-entrega-pdf-teste.ts <pasta-de-saida>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { periodoDoMes, type EncargoEntrada } from "../src/lib/termo-entrega/calculo";
import { MODELO_PADRAO, documentoVazio, montarRetrato, pendenciasParaGerar, type Assinatura } from "../src/lib/termo-entrega/conteudo";
import { gerarPdfTermo } from "../src/lib/termo-entrega/pdf";

const saida = process.argv[2] ?? "./pdf-teste";
mkdirSync(saida, { recursive: true });
const fonte = (arquivo: string) => new Uint8Array(readFileSync(path.join("public/fonts/avaliacao", arquivo)));
const fontes = { serif: fonte("LiberationSerif-Regular.ttf"), serifItalico: fonte("LiberationSerif-Italic.ttf"), sans: fonte("LiberationSans-Regular.ttf"), sansNegrito: fonte("LiberationSans-Bold.ttf") };
const timbrado = { bytes: new Uint8Array(readFileSync("public/brand/papel-timbrado-sacra.jpg")), mime: "image/jpeg" };

let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const base = (p: Partial<EncargoEntrada>): EncargoEntrada => ({
  id: id(),
  categoria: "outro",
  descricao: "",
  competencia: "",
  periodoInicio: null,
  periodoFim: null,
  vencimento: null,
  valorTotalCentavos: 0,
  pagoPor: "vendedor",
  responsavel: "proporcional",
  tipoCalculo: "proporcional_dias",
  manualVendedorCentavos: 0,
  manualCompradorCentavos: 0,
  observacao: "",
  ...p,
});

function documento(completo: boolean) {
  const doc = documentoVazio(MODELO_PADRAO);
  const v1 = id();
  doc.partes = [
    { id: v1, papel: "vendedor", nome: "Fulano de Tal Exemplo (dado fictício)", cpfCnpj: "000.000.000-00", rg: "0.000.000 SSP/DF", email: "vendedor@exemplo.com", clienteId: null },
    { id: id(), papel: "vendedor", nome: "Beltrana Exemplo da Silva (dado fictício)", cpfCnpj: "111.111.111-11", rg: "1.111.111 SSP/DF", email: "vendedora@exemplo.com", clienteId: null },
    { id: id(), papel: "comprador", nome: "Ciclana Exemplo de Oliveira (dado fictício)", cpfCnpj: "222.222.222-22", rg: "22.222.222-2", email: "compradora@exemplo.com", clienteId: null },
  ];
  doc.imovel = { endereco: "Apartamento nº 303, Bloco A, Lote 55, Avenida Exemplo, Águas Claras, Distrito Federal (endereço fictício)", areaPrivativa: "28,02 m²", matricula: "000000", cartorio: "3º Ofício de Registro de Imóveis do DF", inscricaoIptu: "00000000", outros: "" };
  doc.dataEntrega = "2026-10-02";
  const out = periodoDoMes(2026, 10);
  doc.encargos = [
    base({ categoria: "condominio", descricao: "Condomínio", competencia: "10/2026", periodoInicio: out.inicio, periodoFim: out.fim, vencimento: "2026-10-12", valorTotalCentavos: 33880, observacao: "Excluindo-se a taxa de lavanderia." }),
    base({ categoria: "iptu_tlp", descricao: "IPTU/TLP 2026", competencia: "2026", periodoInicio: "2026-01-01", periodoFim: "2026-12-31", valorTotalCentavos: 62327 }),
  ];
  if (completo) {
    doc.encargos.push(
      base({ categoria: "energia", descricao: "Energia", competencia: "09/2026", valorTotalCentavos: 12000, pagoPor: "comprador", tipoCalculo: "manual", manualVendedorCentavos: 8000, manualCompradorCentavos: 4000, observacao: "Fatura quitada pelo comprador na transferência de titularidade." }),
      base({ categoria: "multa_condominial", descricao: "Multa condominial", competencia: "08/2026", valorTotalCentavos: 15000, pagoPor: "nao_pago", tipoCalculo: "integral", responsavel: "vendedor" }),
      base({ categoria: "taxa_extraordinaria", descricao: "Taxa extraordinária", competencia: "10/2026", valorTotalCentavos: 9001, pagoPor: "vendedor", tipoCalculo: "integral", responsavel: "ambos" })
    );
    doc.demais.energia = { status: "transferencia_necessaria", observacao: "Solicitar na Neoenergia." };
    doc.clausula.observacoes = "Chaves entregues: 2 da porta principal e 1 controle da garagem.";
  }
  doc.demais.agua = { status: "incluido_condominio", observacao: "" };
  doc.demais.gas = { status: "incluido_condominio", observacao: "" };
  doc.ressarcimento = { beneficiario: v1, nome: "", cpfCnpj: "", banco: "Caixa Econômica Federal", agencia: "0000", conta: "000000000-0", tipoConta: "corrente", chavePix: "vendedor@exemplo.com", tipoChavePix: "email" };
  return doc;
}

// assinatura de exemplo: PNG 1x1 transparente (só para exercitar o bloco)
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function main() {
  for (const [nome, completo, assinado] of [
    ["termo-modelo-atual", false, false],
    ["termo-completo-assinado", true, true],
  ] as const) {
    const doc = documento(completo);
    const pendencias = pendenciasParaGerar(doc);
    if (pendencias.length) throw new Error(pendencias.join("; "));
    const retrato = montarRetrato(doc, { codigo: "TEC-0000-TESTE", versao: 1, geradoEm: "2026-10-02T15:00:00Z", geradoPorNome: "Teste", modelo: MODELO_PADRAO });
    const assinaturas: Assinatura[] = assinado
      ? doc.partes.map((p, i) => ({ papel: p.papel, nomeEsperado: p.nome, nomeDigitado: p.nome, imagem: PNG, assinadoEm: `2026-10-02T1${5 + i}:10:00Z`, ip: "203.0.113.10" }))
      : [];
    const pdf = await gerarPdfTermo(retrato, { timbrado, fontes, assinaturas, marcaDagua: assinado ? null : "MINUTA" });
    const arquivo = path.join(saida, `${nome}.pdf`);
    writeFileSync(arquivo, pdf);
    console.log(arquivo, `${Math.round(pdf.length / 1024)} KB`, retrato.textos.resultado);
  }
}
main();
