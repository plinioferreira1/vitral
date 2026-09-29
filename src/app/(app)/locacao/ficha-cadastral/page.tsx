import { FileUp, ShieldCheck } from "lucide-react";
import {
  AcoesFichaCadastral,
  URL_FICHA_CADASTRAL,
} from "@/components/locacao/acoes-ficha-cadastral";

export default function FichaCadastralLocacaoPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />

        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden rounded-2xl bg-amber-50 p-3 text-amber-700 sm:block">
              <FileUp className="h-6 w-6" />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                Locação
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Ficha cadastral de locação
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Envie este formulário ao proponente para reunir os dados cadastrais,
                documentos e assinatura necessários à análise da locação.
              </p>
            </div>
          </div>

          <AcoesFichaCadastral />
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 text-sm text-slate-600 sm:px-6">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            O preenchimento e os anexos são enviados diretamente ao formulário oficial
            da SACRA no Zoho. O Vitral não cria uma segunda cópia desses documentos.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          src={URL_FICHA_CADASTRAL}
          title="Ficha Cadastral de Locação | SACRA"
          className="h-[calc(100vh-180px)] min-h-[780px] w-full border-0 bg-white"
          loading="eager"
        />
        <noscript>
          <p className="p-6 text-sm text-slate-600">
            Para preencher a ficha, abra o formulário em uma nova guia.
          </p>
        </noscript>
      </section>
    </div>
  );
}
