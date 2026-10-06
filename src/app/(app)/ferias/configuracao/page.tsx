import { redirect } from "next/navigation";

/** O cadastro de quem tem direito a férias agora fica na ficha do colaborador (Departamento Pessoal). */
export default function CadastroFeriasPage() {
  redirect("/dp/colaboradores");
}
