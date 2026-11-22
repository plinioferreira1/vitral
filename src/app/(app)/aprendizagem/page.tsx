import { redirect } from "next/navigation";

/** Link legado: a experiência agora fica toda em Onboarding e Ajuda. */
export default function AprendizagemLegada(){
  redirect("/corretor#onboarding");
}
