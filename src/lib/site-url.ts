import { headers } from "next/headers";

/**
 * Monta a URL base do site (https://dominio.com) a partir dos
 * headers da própria requisição — não depende de nenhuma variável
 * de ambiente estar configurada certinho no Vercel. Cai pra
 * NEXT_PUBLIC_SITE_URL só se, por algum motivo, os headers não
 * tiverem o host (bem raro).
 */
export async function obterSiteUrl(): Promise<string> {
  const listaHeaders = await headers();
  const host = listaHeaders.get("x-forwarded-host") ?? listaHeaders.get("host");
  const proto = listaHeaders.get("x-forwarded-proto") ?? "https";

  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}
