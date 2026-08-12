"use client";

import { useState } from "react";

export function BotaoCopiarLink({
  url,
  texto,
  rotulo = "Copiar link",
}: {
  url?: string;
  texto?: string;
  rotulo?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const conteudo = texto ?? url ?? "";

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(conteudo);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
    >
      {copiado ? "Copiado!" : rotulo}
    </button>
  );
}
