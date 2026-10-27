// Layout do PDF de multa e juros sem banco: npx tsx scripts/multa-juros-pdf-teste.ts <pasta>  (dados fictícios)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { calcularAtraso } from "../src/lib/locacao/atraso";
import { gerarPdfMemoriaAtraso } from "../src/lib/locacao/pdf-atraso";

const pasta = process.argv[2] ?? ".";
const ler = (p: string) => new Uint8Array(readFileSync(join(process.cwd(), p)));
const sans = ler("public/fonts/avaliacao/LiberationSans-Regular.ttf");
const negrito = ler("public/fonts/avaliacao/LiberationSans-Bold.ttf");
const memoria = calcularAtraso({
  dataCalculo: "2026-10-27", multaPct: 10, jurosMensalPct: 1, indice: "IGP-M",
  itens: [
    { descricao: "Aluguel", competencia: "2026-08", vencimento: "2026-08-10", valorCentavos: 280000, correcaoPct: 0.92 },
    { descricao: "Aluguel", competencia: "2026-09", vencimento: "2026-09-10", valorCentavos: 280000, correcaoPct: 0.41 },
    { descricao: "Condomínio", competencia: "2026-09", vencimento: "2026-09-05", valorCentavos: 64350, correcaoPct: 0.45 },
    { descricao: "IPTU/TLP (parcela 8)", vencimento: "2026-10-15", valorCentavos: 21890, correcaoPct: 0 },
    { descricao: "Aluguel", competencia: "2026-10", vencimento: "2026-10-30", valorCentavos: 280000 },
  ],
});
gerarPdfMemoriaAtraso(memoria, {
  contrato: "Contrato 0123 (fictício)", locatario: "Locatário Exemplo da Silva", locador: "Locadora Exemplo Ltda.",
  imovel: "SQN 000 Bloco Z Apto 000, Asa Norte, Brasília/DF", seguradora: "Seguradora Exemplo · apólice 000000",
  observacoes: "Débitos apurados até a data do cálculo. Valores fictícios para conferência de layout.",
  elaboradoPor: "Equipe de Locação", geradoEm: "27/10/2026 17:40",
}, { timbrado: { bytes: ler("public/brand/papel-timbrado-sacra.jpg"), mime: "image/jpeg" }, fontes: { serif: sans, serifItalico: sans, sans, sansNegrito: negrito } })
  .then((bytes) => { writeFileSync(join(pasta, "memoria-multa-juros.pdf"), bytes); console.log("ok", bytes.length); });
