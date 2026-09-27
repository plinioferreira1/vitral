"use client";

import { useState } from "react";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/mascaras";

type CampoMascaradoProps = {
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
      name={name}
      value={valor}
      onChange={(event) => setValor(aplicarMascara(mask, event.target.value))}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
