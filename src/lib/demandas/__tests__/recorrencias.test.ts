import {describe,it,expect} from "vitest";
import {proximoVencimento} from "../recorrencias";

describe("recorrências",()=>{
 it("avança diariamente",()=>expect(proximoVencimento("2026-11-17","diaria")).toBe("2026-11-18"));
 it("avança semanalmente",()=>expect(proximoVencimento("2026-11-17","semanal")).toBe("2026-11-24"));
 it("ajusta fevereiro",()=>expect(proximoVencimento("2026-01-31","mensal")).toBe("2026-02-28"));
 it("avança dezembro para janeiro",()=>expect(proximoVencimento("2026-12-31","mensal")).toBe("2027-01-31"));
 it("preserva o dia 31 após fevereiro",()=>expect(proximoVencimento("2026-02-28","mensal",31)).toBe("2026-03-31"));
 it("preserva o dia 30 após fevereiro",()=>expect(proximoVencimento("2027-02-28","mensal",30)).toBe("2027-03-30"));
 it("respeita fevereiro bissexto",()=>expect(proximoVencimento("2028-01-31","mensal",31)).toBe("2028-02-29"));
 it("passa do fevereiro bissexto para março",()=>expect(proximoVencimento("2028-02-29","mensal",31)).toBe("2028-03-31"));
 it("avança a rotina mensal de novembro para dezembro",()=>expect(proximoVencimento("2026-11-30","mensal",30)).toBe("2026-12-30"));
 it("avança rotina semanal pela virada do ano",()=>expect(proximoVencimento("2026-12-30","semanal")).toBe("2027-01-06"));
 it("avança rotina diária pela virada do ano",()=>expect(proximoVencimento("2026-12-31","diaria")).toBe("2027-01-01"));
 it("recusa periodicidade não reconhecida",()=>expect(()=>proximoVencimento("2026-11-17","quinzenal")).toThrow("Periodicidade inválida"));
 it("recusa data vazia",()=>expect(()=>proximoVencimento("","mensal")).toThrow("Data inválida"));
});
