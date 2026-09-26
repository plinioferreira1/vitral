import { PainelLancamentos } from "../painel-lancamentos";

export default async function ContasAReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; categoria?: string; pessoa?: string; q?: string }>;
}) {
  const params = await searchParams;
  return <PainelLancamentos tipo="receita" searchParams={params} />;
}
