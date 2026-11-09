import Image from "next/image";
import { InicioFicha } from "./inicio-formulario";

const ERROS: Record<string,string> = {
 nome: "Informe o nome completo do locatário, com nome e sobrenome.",
 existente: "Outra pessoa já está preenchendo esta vaga de fiador para essa proposta. Confira se você é o fiador 1 ou o fiador 2, ou fale com a SACRA.",
 enviada: "Sua ficha para essa proposta já foi enviada. Se precisar corrigir algo, fale com a SACRA.",
 cpf: "Informe seu CPF corretamente para abrir ou continuar sua ficha.",
 salvar: "Não foi possível abrir sua ficha neste momento. Tente novamente.",
 limite: "Muitas fichas foram abertas recentemente nesta conexão. Tente novamente mais tarde ou fale com a SACRA."
};

export default async function CadastroLocacaoPublico({searchParams}:{searchParams:Promise<{erro?:string}>}) {
 const {erro}=await searchParams;
 return <main className="min-h-screen bg-[#f7f5f2] px-4 py-8 sm:py-12">
   <div className="mx-auto max-w-xl">
    <header className="mb-7 text-center"><Image src="/brand/sacra-logo-vertical-bordo.png" alt="Sacra Netimóveis" width={240} height={120} className="mx-auto h-20 w-auto object-contain" priority/><h1 className="mt-3 text-xl font-bold text-[#731515]">Ficha cadastral de locação</h1><p className="mt-2 text-sm text-stone-600">Um link para todos. Cada pessoa preenche, anexa documentos e assina a própria ficha.</p></header>
    {erro && ERROS[erro] && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{ERROS[erro]}</p>}
    <InicioFicha />
    <p className="mt-6 text-center text-xs text-stone-500">SACRA Netimóveis · Seus documentos são enviados em ambiente privado e conferidos pela equipe de locação.</p>
   </div>
 </main>;
}
