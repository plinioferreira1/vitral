import {describe,it,expect} from "vitest";
import {proximoVencimento} from "../recorrencias";
describe("recorrências",()=>{
 it("avança diariamente",()=>expect(proximoVencimento("2026-11-17","diaria")).toBe("2026-11-18"));
 it("avança semanalmente",()=>expect(proximoVencimento("2026-11-17","semanal")).toBe("2026-11-24"));
 it("ajusta fevereiro",()=>expect(proximoVencimento("2026-01-31","mensal")).toBe("2026-02-28"));
 it("avança dezembro para janeiro",()=>expect(proximoVencimento("2026-12-31","mensal")).toBe("2027-01-31"));
});
