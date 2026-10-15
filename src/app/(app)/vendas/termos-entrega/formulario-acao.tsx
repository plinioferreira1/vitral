import type { ComponentProps } from "react";
import { FormularioNativo } from "@/components/formulario-nativo";

export function FormularioAcaoTermo({ acao, children, ...props }: Omit<ComponentProps<typeof FormularioNativo>, "action"> & { acao: string }) {
  return <FormularioNativo {...props} action="/vendas/termos-entrega/comandos">
    <input type="hidden" name="acao" value={acao} />
    {children}
  </FormularioNativo>;
}
