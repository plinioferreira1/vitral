"use client";

import { useState } from "react";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/mascaras";

type CampoMascaradoProps = {
  id?: string;
  name: string;
  className: string;
  mask: "cpf_cnpj" | "telefone";
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
};

function aplicarMascara(mask: CampoMascaradoProps["mask"], valor: string) {
  return mask === "cpf_cnpj" ? formatarCpfCnpj(valor) : formatarTelefone(valor);
}

export function CampoMascarado({
  id,
  name,
  className,
  mask,
  defaultValue,
  placeholder,
  required = false,
}: CampoMascaradoProps) {
  const [valor, setValor] = useState(() => aplicarMascara(mask, defaultValue ?? ""));

  return (
    <input
      id={id}
      name={name}
      value={valor}
      onChange={(event) => setValor(aplicarMascara(mask, event.target.value))}
      inputMode={mask === "telefone" ? "tel" : "numeric"}
      autoComplete={mask === "telefone" ? "tel" : "off"}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
