const FORMAS_PAGAMENTO = [
  "Pix",
  "Boleto",
  "Transferência",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Cheque",
  "Débito automático",
];

export function CampoFormaPagamento({
  name = "forma_pagamento",
  defaultValue,
  className,
  placeholder = "Selecione...",
}: {
  name?: string;
  defaultValue?: string | null;
  className: string;
  placeholder?: string;
}) {
  const valorAtual = String(defaultValue ?? "").trim();
  const valorCadastradoForaDaLista = valorAtual && !FORMAS_PAGAMENTO.includes(valorAtual);

  return (
    <select name={name} defaultValue={valorAtual} className={className}>
      <option value="">{placeholder}</option>
      {valorCadastradoForaDaLista && <option value={valorAtual}>{valorAtual}</option>}
      {FORMAS_PAGAMENTO.map((forma) => (
        <option key={forma} value={forma}>
          {forma}
        </option>
      ))}
    </select>
  );
}
