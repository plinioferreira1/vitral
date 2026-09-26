import { PainelLancamentos } from "../painel-lancamentos";

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; categoria?: string; pessoa?: string; q?: string }>;
}) {
  const params = await searchParams;
  return <PainelLancamentos tipo="despesa" searchParams={params} />;
}
