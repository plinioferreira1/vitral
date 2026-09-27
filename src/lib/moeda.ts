export function moedaParaNumero(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== "string") return 0;

  const limpo = valor.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return 0;

  const temVirgula = limpo.includes(",");
  if (temVirgula) {
    const normalizado = limpo.replace(/\./g, "").replace(",", ".");
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  const pontos = limpo.split(".");
  if (pontos.length === 2 && pontos[1].length <= 2) {
    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : 0;
  }

  const numero = Number(limpo.replace(/\./g, ""));
  return Number.isFinite(numero) ? numero : 0;
}

export function formatarMoedaBR(valor: unknown): string {
  return moedaParaNumero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarDecimalMoedaBR(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const numero = moedaParaNumero(valor);
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
