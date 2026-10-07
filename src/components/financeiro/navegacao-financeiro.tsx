"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavegacaoContexto } from "@/components/navegacao-contexto";

const links = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/contas-a-pagar", label: "A pagar" },
  { href: "/financeiro/contas-a-receber", label: "A receber" },
  { href: "/financeiro/transferencias", label: "Transferências" },
  { href: "/financeiro/cartao-corporativo", label: "Cartões e faturas" },
  { href: "/financeiro/contas-bancarias", label: "Contas bancárias" },
  { href: "/financeiro/pessoas", label: "Pessoas e empresas" },
  { href: "/financeiro/relatorios", label: "Relatórios" },
];

export function NavegacaoFinanceiro() {
  const pathname = usePathname();
  const configuracao = ["/financeiro/categorias", "/financeiro/configuracoes-email"].includes(pathname);
  if (configuracao) return <Link href="/configuracoes" className="inline-flex text-sm font-medium text-brand hover:underline">← Configurações gerais</Link>;
  // Formulários já têm o retorno e as ações do lançamento; o contexto não compete com o formulário.
  if (pathname.startsWith("/financeiro/lancamentos/")) return null;
  return <NavegacaoContexto links={links} nome="Navegação do Financeiro" />;
}
