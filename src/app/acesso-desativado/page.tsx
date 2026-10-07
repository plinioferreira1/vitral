import Image from "next/image";
import { ShieldX } from "lucide-react";
import { sair } from "@/app/login/actions";
import { BotaoEnviar } from "@/components/botao-enviar";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";

export default function AcessoDesativadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f1ea] px-5 py-10 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-white/80 bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(28,25,23,0.12)]">
        <Image
          src="/brand/vitral-icone-bordo-dourado.svg"
          alt="Vitral"
          width={48}
          height={48}
          className="mx-auto h-12 w-12"
        />
        <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <ShieldX size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Acesso desativado
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Sua conta e o histórico continuam preservados, mas o acesso ao Vitral
          foi desativado. Fale com um diretor ou gerente da empresa para
          solicitar a reativação.
        </p>
        <form action={sair} className="mt-6">
          <BotaoEnviar className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            Sair da conta
          </BotaoEnviar>
        </form>
      </section>
    </main>
  );
}
