"use client";

import { useEffect, useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";

/** Recuperação explícita; nunca recarrega nem repete uma gravação automaticamente. */
export function CarregamentoDemorado() {
  const [demorado, setDemorado] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDemorado(true), 15000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!demorado) return null;
  return <div role="status" className="rounded-xl border border-border bg-surface p-4">
    <p className="text-sm text-ink-muted">Esta tela está demorando mais que o esperado. Você pode recarregar ou escolher outra opção no menu.</p>
    <button type="button" className={`${SECONDARY_BUTTON_CLASS} mt-3`} onClick={() => window.location.reload()}>Recarregar página</button>
  </div>;
}
