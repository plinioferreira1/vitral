import type { CSSProperties, HTMLAttributes } from "react";

type Variante = "bordo" | "dourado" | "branco" | "preto";

const CORES: Record<Variante, string> = {
  bordo: "#731515",
  dourado: "#D28C2C",
  branco: "#FFFFFF",
  preto: "#1D1D1B",
};

/** Marca horizontal Sacra Netimóveis enviada pela empresa, recolorida sem alterar o desenho. */
export function SacraLogo({
  variante = "bordo",
  className = "",
  label = "Sacra Netimóveis",
  ...props
}: {
  variante?: Variante;
  className?: string;
  label?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "className" | "children">) {
  const estilo: CSSProperties = {
    aspectRatio: "412 / 60",
    backgroundColor: CORES[variante],
    WebkitMaskImage: 'url("/brand/sacra-logo-nova-mask.png")',
    maskImage: 'url("/brand/sacra-logo-nova-mask.png")',
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
  return <span {...props} role="img" aria-label={label} className={`inline-block shrink-0 ${className}`} style={estilo} />;
}
