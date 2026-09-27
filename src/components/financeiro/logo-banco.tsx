import { Landmark } from "lucide-react";
import { identidadeBanco } from "@/lib/bancos";

type LogoBancoProps = {
  banco: string | null | undefined;
  size?: "sm" | "md";
  mostrarNome?: boolean;
};

export function LogoBanco({ banco, size = "md", mostrarNome = false }: LogoBancoProps) {
  const id = identidadeBanco(banco);
  const compacto = size === "sm";

  return (
    <div className="flex shrink-0 items-center gap-2" title={id.nome}>
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden border font-black shadow-sm ${
          compacto ? "h-9 w-12 rounded-md text-[10px]" : "h-11 w-16 rounded-lg text-[11px]"
        }`}
        style={{
          background: `linear-gradient(135deg, ${id.bg}, ${id.accent})`,
          borderColor: id.border ?? "transparent",
          color: id.fg,
        }}
      >
        <span className="absolute -right-3 -top-4 h-9 w-9 rounded-full bg-white/20" />
        <span className="absolute -bottom-5 -left-4 h-10 w-10 rounded-full bg-black/10" />
        <span className="relative z-10 max-w-[52px] truncate px-1 leading-none">
          {id.generico ? <Landmark size={compacto ? 14 : 16} strokeWidth={2.4} /> : id.sigla}
        </span>
      </div>
      {mostrarNome && <span className="truncate text-xs font-semibold text-ink">{id.nome}</span>}
    </div>
  );
}
