"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavegacaoContexto } from "@/components/navegacao-contexto";

const links = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/lancamentos", label: "Lançamentos" },
  { href: "/financeiro/contas-e-cartoes", label: "Contas e cartões" },
  { href: "/financeiro/relatorios", label: "Relatórios" },
];

export function NavegacaoFinanceiro() {
  const pathname = usePathname();
  const configuracao = ["/financeiro/categorias", "/financeiro/configuracoes-email"].includes(pathname);
  if (configuracao) return <Link href="/configuracoes" className="inline-flex text-sm font-medium text-brand hover:underline">← Configurações gerais</Link>;
  if (pathname.startsWith("/financeiro/lancamentos/")) return null;
  return <NavegacaoContexto links={links} nome="Navegação do Financeiro" />;
}
