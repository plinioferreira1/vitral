"use client";

import { useEffect, useState } from "react";

function formatarCentavos(centavos: number): string {
  if (!centavos) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface Props {
  name?: string;
  defaultValue?: number | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onValorChange?: (valorEmReais: number) => void;
}

/**
 * Campo de valor com máscara de moeda: digita "500000" e o campo
 * já mostra "5.000,00" à medida que você digita (tratando os dois
 * últimos dígitos como centavos, igual app de banco). Se receber
 * `name`, também expõe um input escondido com o valor puro em
 * decimal (ex: "500000.00"), pronto pra Server Action ler.
 */
export function CampoMoeda({
  name,
  defaultValue,
  placeholder = "0,00",
  required,
  className,
  onValorChange,
}: Props) {
  const [centavos, setCentavos] = useState(() =>
    defaultValue ? Math.round(defaultValue * 100) : 0
  );

  // só na montagem — evita que o pai fique com um valor "fantasma" (mostrado
  // no campo, mas não recebido em seu próprio estado) quando defaultValue é usado
  useEffect(() => {
    if (defaultValue) onValorChange?.(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aoDigitar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const somenteDigitos = e.target.value.replace(/\D/g, "");
    const novoCentavos = somenteDigitos ? parseInt(somenteDigitos, 10) : 0;
    setCentavos(novoCentavos);
    onValorChange?.(novoCentavos / 100);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-ink-muted">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatarCentavos(centavos)}
        onChange={aoDigitar}
        placeholder={placeholder}
        required={required}
        className={
          className ??
          "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        }
      />
      {name && <input type="hidden" name={name} value={(centavos / 100).toFixed(2)} />}
    </div>
  );
}
