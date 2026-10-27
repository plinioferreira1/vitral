import { describe, expect, it } from "vitest";
import { centavosDe, conferirConciliacao, conferirSaldos, descricaoSugerida, lerExtratoInter, lerOFX, sugestoes, type LancamentoAberto } from "./extrato";

const OFX = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>077<ACCTID>20527527</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20260901<DTEND>20260930
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260901120000<TRNAMT>-242.00<FITID>A1<MEMO>PIX ENVIADO FULANO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260902<TRNAMT>20000.00<FITID>A2<MEMO>PIX RECEBIDO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260902<TRNAMT>-10.20<MEMO>TARIFA</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260902<TRNAMT>-10.20<MEMO>TARIFA</STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>41181.68<DTASOF>20260930</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const INTER = `SACRA EXEMPLO LTDA
CPF/CNPJ: 00.000.000/0001-00, Instituição: Banco Inter, Agência: 0001-9, Conta: 1234567-8
Período: 01/09/2026 a 30/09/2026

 1 de Setembro de 2026 Saldo do dia: R$ 958,00
 Pix enviado: "Cp :1-Fulano"                                                  -R$ 242,00                    R$ 958,00

 2 de Setembro de 2026 Saldo do dia: R$ 20.958,00
 Pix recebido: "Cp :2-Cliente"                                     R$ 20.000,00                    R$ 20.958,00
 Pix enviado: "Cp :1-Fulano"                                                  -R$ 242,00                    R$ 20.716,00
 Pix enviado: "Cp :1-Fulano"                                                  -R$ 242,00                    R$ 20.474,00
`;

describe("leitura de extratos", () => {
  it("lê OFX, com chave própria para linhas sem FITID repetidas", () => {
    const e = lerOFX(OFX);
    expect(e.conta).toBe("20527527");
    expect(e.linhas.map((l) => l.valorCentavos)).toEqual([-24200, 2000000, -1020, -1020]);
    expect(new Set(e.linhas.map((l) => l.chave)).size).toBe(4);
    expect(e.saldo).toEqual({ valorCentavos: 4118168, data: "2026-09-30" });
    expect(() => lerOFX("qualquer coisa")).toThrow(/OFX/);
  });
  it("lê o PDF do Inter e confere os saldos", () => {
    const e = lerExtratoInter(INTER);
    expect(e.conta).toBe("1234567-8");
    expect(e.inicio).toBe("2026-09-01");
    expect(e.linhas).toHaveLength(4);
    expect(e.linhas[1]).toMatchObject({ data: "2026-09-02", valorCentavos: 2000000 });
    expect(e.linhas[2].chave).not.toBe(e.linhas[3].chave);
    expect(e.saldo?.valorCentavos).toBe(2047400);
    expect(conferirSaldos(120000, e.linhas, 2047400)).toBe(true);
    expect(conferirSaldos(120000, e.linhas.slice(1), 2047400)).toBe(false);
  });
  it("converte valores", () => {
    expect(centavosDe("1.234,56")).toBe(123456);
    expect(centavosDe("-10.20")).toBe(-1020);
    expect(centavosDe("abc")).toBeNaN();
  });
});

describe("conciliação", () => {
  const abertos: LancamentoAberto[] = [
    { id: "a", tipo: "despesa", descricao: "Condomínio sala", pessoa: "Condominio do Edificio Fusion", vencimento: "2026-09-05", saldoCentavos: 113431 },
    { id: "b", tipo: "despesa", descricao: "Outra conta", pessoa: null, vencimento: "2026-09-04", saldoCentavos: 113431 },
    { id: "c", tipo: "receita", descricao: "Comissão", pessoa: null, vencimento: "2026-09-04", saldoCentavos: 113431 },
    { id: "d", tipo: "despesa", descricao: "Muito antiga", pessoa: null, vencimento: "2026-01-04", saldoCentavos: 113431 },
  ];
  it("sugere pelo valor exato, prioriza o nome e nunca mistura receita com despesa", () => {
    const s = sugestoes({ data: "2026-09-04", valorCentavos: -113431, descricao: 'Pagamento efetuado: "CONDOMINIO DO EDIFICIO FUSION"' }, abertos);
    expect(s.map((x) => x.lancamento.id)).toEqual(["a", "b"]);
  });
  it("só fecha com a soma exata", () => {
    expect(conferirConciliacao(-113431, [{ tipo: "despesa", saldoCentavos: 113431 }])).toBeNull();
    expect(conferirConciliacao(-113431, [{ tipo: "receita", saldoCentavos: 113431 }])).toMatch(/não se misturam/);
    expect(conferirConciliacao(-113431, [{ tipo: "despesa", saldoCentavos: 100000 }])).toMatch(/não bate/);
    expect(conferirConciliacao(-1, [])).toMatch(/ao menos/);
  });
  it("limpa a descrição sugerida", () => {
    expect(descricaoSugerida('Pix enviado: "Cp :33264668-Gabriel Sousa"')).toBe("Gabriel Sousa (Pix enviado)");
    expect(descricaoSugerida('Pagamento efetuado: "REALMATE TECNOLOGIA LTDA"')).toBe("REALMATE TECNOLOGIA LTDA (Pagamento efetuado)");
  });
});
