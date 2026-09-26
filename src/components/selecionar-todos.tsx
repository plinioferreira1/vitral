"use client";

/**
 * Checkbox de cabeçalho que marca/desmarca todos os checkboxes de
 * linha associados ao mesmo formulário (via atributo form=), sem
 * precisar de estado React — só alterna o "checked" de cada um.
 */
export function SelecionarTodos({ formId, className }: { formId: string; className?: string }) {
  return (
    <input
      type="checkbox"
      className={className}
      aria-label="Selecionar todos"
      onChange={(e) => {
        // As checkboxes de linha ficam fora do <form> no DOM (evita
        // formulário aninhado dentro das ações de cada linha) e se
        // associam a ele via atributo form=, então a busca é pelo
        // documento inteiro, não pela subárvore do form.
        const checkboxes = document.querySelectorAll<HTMLInputElement>(
          `input[type="checkbox"][form="${formId}"]`
        );
        checkboxes.forEach((cb) => {
          cb.checked = e.target.checked;
        });
      }}
    />
  );
}
