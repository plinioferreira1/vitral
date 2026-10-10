export function progressoVgv(realizadoCentavos: number, metaCentavos: number) {
  if (!Number.isSafeInteger(realizadoCentavos) || realizadoCentavos < 0 ||
      !Number.isSafeInteger(metaCentavos) || metaCentavos <= 0) {
    throw new Error("Informe um VGV não negativo e uma meta positiva em centavos inteiros.");
  }
  const percentual = realizadoCentavos / metaCentavos * 100;
  return {
    percentual,
    percentualBarra: Math.min(100, percentual),
    restanteCentavos: Math.max(0, metaCentavos - realizadoCentavos),
  };
}
