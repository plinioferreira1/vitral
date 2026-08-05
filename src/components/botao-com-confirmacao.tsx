"use client";

export function BotaoComConfirmacao({
  mensagem,
  children,
  className,
}: {
  mensagem: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensagem)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
