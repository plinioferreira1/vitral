import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Landmark, CreditCard, ArrowLeftRight, FileCheck2, Users, FileText, ArrowUpRight } from "lucide-react";

const atalhos = [
  { href: "/financeiro/contas-bancarias", titulo: "Contas bancárias", descricao: "Saldos, bancos e movimentações de cada conta.", icon: Landmark },
  { href: "/financeiro/cartao-corporativo", titulo: "Cartões e faturas", descricao: "Faturas corporativas, despesas e categorização.", icon: CreditCard },
  { href: "/financeiro/extratos", titulo: "Extratos e conciliação", descricao: "Importar OFX e conferir movimentações bancárias.", icon: FileCheck2 },
  { href: "/financeiro/transferencias", titulo: "Transferências", descricao: "Transferir valores entre contas.", icon: ArrowLeftRight },
  { href: "/financeiro/pessoas", titulo: "Pessoas e empresas", descricao: "Fornecedores, clientes e colaboradores financeiros.", icon: Users },
  { href: "/financeiro/documentos-pdf", titulo: "Documentos para conferir", descricao: "Organização de documentos e comprovantes PDF.", icon: FileText },
];

export default function ContasECartoesPage() {
  return (
    <div className="financeiro-ui space-y-5">
      <CabecalhoPagina titulo="Contas e cartões" descricao="Tudo sobre bancos, cartões, transferências e conciliação em um só lugar." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {atalhos.map(({ href, titulo, descricao, icon: Icone }) => (
          <Link href={href} key={href}
            className="group flex min-h-36 flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-brand/50 hover:bg-background">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-brand-soft p-2.5 text-brand"><Icone size={20} /></span>
              <ArrowUpRight size={17} className="text-ink-muted group-hover:text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{descricao}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
