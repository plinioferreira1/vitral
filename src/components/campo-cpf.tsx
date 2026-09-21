"use client";

import { useState } from "react";

function formatarCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length > 9) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }
  if (digitos.length > 6) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  }
  if (digitos.length > 3) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  }
  return digitos;
}

interface Props {
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (valor: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

/**
 * Campo de CPF com máscara automática: digita só números e o
 * campo já formata como "000.000.000-00" à medida que você
 * digita. Funciona de dois jeitos:
 * - Dentro de um <form action={...}> comum: passa `name` (e
 *   opcionalmente `defaultValue`) — o próprio campo controla seu
 *   estado e envia o valor já formatado no submit.
 * - Controlado de fora (ex: formulário sem submit de form, feito
 *   na mão): passa `value` + `onChange`.
 */
export function CampoCPF({
  name,
  defaultValue,
  value,
  onChange,
  placeholder = "000.000.000-00",
  required,
  className,
  id,
}: Props) {
  const controlado = value !== undefined;
  const [interno, setInterno] = useState(() => formatarCPF(defaultValue ?? ""));
  const valorAtual = controlado ? formatarCPF(value ?? "") : interno;

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const formatado = formatarCPF(e.target.value);
    if (controlado) {
      onChange?.(formatado);
    } else {
      setInterno(formatado);
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      name={controlado ? undefined : name}
      value={valorAtual}
      onChange={aoDigitar}
      placeholder={placeholder}
      required={required}
      maxLength={14}
      className={
        className ??
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      }
    />
  );
}
