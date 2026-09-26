"use client";

/**
 * <select> que envia o formulário em que está inserido assim que o
 * valor muda — usado pro seletor "X por página" da paginação, pra
 * não precisar de um botão "Aplicar" separado.
 */
export function SelectAutoSubmit({
  name,
  defaultValue,
  options,
  className,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(e) => e.currentTarget.form?.submit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
