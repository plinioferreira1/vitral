import { expect, it } from "vitest";
import { corPrazoFinal } from "./cor-prazo-final";

it.each([[-21, "vermelho"], [-1, "vermelho"], [0, "amarelo"], [2, "amarelo"], [7, "amarelo"], [8, "neutro"], [15, "neutro"], [61, "neutro"]] as const)("classifica o prazo de %i dias como %s", (dias, cor) => {
  expect(corPrazoFinal(dias)).toBe(cor);
});
