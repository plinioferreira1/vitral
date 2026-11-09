/** Gera os PDFs dos contratos com dados fictícios: npx tsx scripts/contratos-locacao-pdf-teste.ts <pasta> */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CPS_FICTICIO, LOCACAO_FICTICIA } from "../src/lib/contratos-locacao/exemplo";
import { montarCps, montarLocacao } from "../src/lib/contratos-locacao/montar";
import { gerarPdfContrato } from "../src/lib/contratos-locacao/pdf";

const pasta = process.argv[2] ?? ".";
const raiz = path.resolve(__dirname, "..");
const timbrado = { bytes: readFileSync(path.join(raiz, "public/brand/papel-timbrado-sacra.jpg")), mime: "image/jpeg" };
const fonte = (n: string) => readFileSync(path.join(raiz, "public/fonts/avaliacao", n));
const fontes = { sans: fonte("LiberationSans-Regular.ttf"), sansNegrito: fonte("LiberationSans-Bold.ttf"), serif: fonte("LiberationSans-Regular.ttf"), serifItalico: fonte("LiberationSans-Regular.ttf") };

(async () => {
  const casos = {
    "locacao-fiador": montarLocacao(LOCACAO_FICTICIA),
    "locacao-titulo": montarLocacao({ ...LOCACAO_FICTICIA, garantia: "titulo_capitalizacao", tituloValorCentavos: 750000, tituloProposta: "000000" }),
    cps: montarCps(CPS_FICTICIO),
  };
  for (const [nome, doc] of Object.entries(casos)) {
    writeFileSync(path.join(pasta, `${nome}.pdf`), await gerarPdfContrato(doc, { timbrado, fontes, marcaDagua: "EXEMPLO" }));
  }
  console.log("ok");
})();
