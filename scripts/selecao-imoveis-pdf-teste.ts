// Gera o PDF da seleção de imóveis com dados fictícios, sem banco: npx tsx scripts/selecao-imoveis-pdf-teste.ts <pasta>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gerarPdfSelecao } from "../src/lib/vendas/pdf-selecao";

const pasta = process.argv[2] ?? ".";
mkdirSync(pasta, { recursive: true });
async function main() {
const pdf = await gerarPdfSelecao(
  { cliente: "Cliente Teste", finalidade: "venda", tipo: "Apartamento", regiao: "Águas Claras", precoMax: 900000, quartos: 3, vagas: 2, areaMin: 80, financiamento: true },
  [
    { id: "1", link: "https://www.dfimoveis.com.br/imovel/exemplo-1", titulo: "Apartamento 3 quartos com vista livre", endereco: "Rua Fictícia 10, Águas Claras", preco: 850000, condominio: 920, area: 92, quartos: 3, vagas: 2, observacao: "Nascente, andar alto, lazer completo." },
    { id: "2", link: "https://www.zapimoveis.com.br/imovel/exemplo-2", titulo: "Apartamento reformado perto do metrô", endereco: "Avenida Fictícia 200, Águas Claras", preco: 790000, condominio: 780, area: 84, quartos: 3, vagas: 2, observacao: "" },
  ],
  "Olá! Separei estas opções dentro do que conversamos. Me diga quais você quer visitar.",
  { corretor: "Corretor Teste", geradoEm: "26/11/2026 10:00" },
  { timbrado: null, fontes: null },
);
writeFileSync(join(pasta, "selecao-imoveis.pdf"), pdf);
console.log("ok", join(pasta, "selecao-imoveis.pdf"));
}
void main();
