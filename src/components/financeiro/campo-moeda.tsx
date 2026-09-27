"use client";

import { useState } from "react";
import { formatarDecimalMoedaBR } from "@/lib/moeda";

type CampoMoedaProps = {
  name: string;
  className: string;
  defaultValue?: number | string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

function formatarInteiro(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";
  return Number(digitos).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function limparEntrada(valor: string) {
  const limpo = valor.replace(/[^\d,.-]/g, "");
  const separador = Math.max(limpo.lastIndexOf(","), limpo.lastIndexOf("."));
  if (separador === -1) return formatarInteiro(limpo);

  const inteiro = formatarInteiro(limpo.slice(0, separador));
  const decimal = limpo.slice(separador + 1).replace(/\D/g, "").slice(0, 2);
  return `${inteiro || "0"},${decimal}`;
}

export function CampoMoeda({
  name,
  className,
  defaultValue,
  placeholder = "0,00",
  required = false,
  disabled = false,
}: CampoMoedaProps) {
  const [valor, setValor] = useState(() => formatarDecimalMoedaBR(defaultValue ?? ""));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
        R$
      </span>
      <input
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={valor}
        onFocus={(event) => event.currentTarget.select()}
        onMouseUp={(event) => event.preventDefault()}
        onChange={(event) => setValor(limparEntrada(event.target.value))}
        onBlur={() => setValor(formatarDecimalMoedaBR(valor))}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} pl-10 tabular-nums`}
      />
    </div>
  );
}
