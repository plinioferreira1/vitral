import test from "node:test";
import assert from "node:assert/strict";
import { extratoInterPDF, faturaInterPDF } from "./pdf-import.js";

test("extrato Banco Inter aceita saldo negativo, preserva data e verifica continuidade", () => {
  const linhas=[
    "Instituição: Banco Inter, Conta: exemplo",
    "19 de Outubro de 2026 Saldo do dia: R$ 18.105,62",
    'Pagamento de Titulo: "NETIMOVEIS HOLDING SA" -R$ 2.724,10 -R$ 265,62',
    'Pix enviado: "Cp :00360305-CEF MATRIZ" -R$ 248,00 -R$ 513,62',
    'Pix recebido: "Cp :14913919-SACRA SOLUCOES IMOBILIARIAS LTDA" R$ 20.000,00 R$ 19.486,38',
  ];
  const extrato=extratoInterPDF(linhas);
  assert.equal(extrato.transacoes.length,3);
  assert.equal(extrato.transacoes[0].valor,-272410);
  assert.equal(extrato.transacoes[0].saldoApos,-26562);
  assert.equal(extrato.inconsistencias.length,0);
});
test("extrato detecta saldo inconsistente e sinaliza pagamento de cartão",()=>{
  const extrato=extratoInterPDF([
    "Banco Inter | Saldo por transação",
    "13 de Outubro de 2026 Saldo do dia: R$ 17.743,22",
    'Pix enviado: "Conta de teste" -R$ 100,00 R$ 4.000,00',
    'Pagamento efetuado: "Debito Automatico Fatura Cartao Inter" -R$ 4.503,73 R$ 200,00'
  ]);
  assert.equal(extrato.inconsistencias.length,1);
  assert.equal(extrato.transacoes[1].pagamentoFatura,true);
});
test("fatura Inter reconhece parcelas e ignora débito de pagamento anterior",()=>{
  const r=faturaInterPDF([
    "Despesas da fatura",
    "5497****2082 10/10/2026 R$ 406,98",
    "CARTÃO 5497****2082",
    "10 de set. 2026 PAGTO DEBITO AUTOMATICO - + R$ 3.068,15",
    "CARTÃO 5497****1371",
    "10 de abr. 2026 PG *LEROY MERLIN (Parcela 06 de 08) - R$ 303,87",
    "CARTÃO 5497****4783",
    "01 de out. 2026 ANTHROPIC* CLAUDE SUB - R$ 103,11",
  ]);
  assert.equal(r.compras.length,2);
  assert.equal(r.compras[0].parcela,6);
  assert.equal(r.compras[0].parcelas,8);
  assert.equal(r.soma,40698);
  assert.equal(r.confere,true);
});
