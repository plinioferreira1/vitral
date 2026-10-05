export function corPrazoFinal(diasRestantes: number): "vermelho" | "amarelo" | "neutro" {
  if (diasRestantes < 0) return "vermelho";
  if (diasRestantes <= 7) return "amarelo";
  return "neutro";
}
