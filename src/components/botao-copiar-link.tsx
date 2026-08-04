"use client";

import { useState } from "react";

export function BotaoCopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
    >
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}
