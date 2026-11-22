"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";

const PRIORIDADES = ["critica","alta","media","baixa"];
const SITUACOES = ["planejado","desenvolvimento","laboratorio","homologacao","publicado","pausado"];
const texto = (f:FormData,k:string,n=2000)=>String(f.get(k)??"").trim().slice(0,n);
const opcional = (v:string)=>v||null;

async function contexto(){
  const sessao=await exigirUsuario(["diretor"]);
  if(!sessao) return null;
  return { db:await createClient(),sessao };
}
async function responsavelValido(db:Awaited<ReturnType<typeof createClient>>,tenant:string,id:string){
  if(!id)return null;
  const {data}=await db.from("usuarios").select("id").eq("tenant_id",tenant).eq("id",id).eq("ativo",true).maybeSingle();
  return data?.id??null;
}

export async function criarMelhoria(form:FormData){
  const ctx=await contexto();if(!ctx)return;
  const titulo=texto(form,"titulo",180),modulo=texto(form,"modulo",80);
  if(titulo.length<4||modulo.length<2)return;
  const prioridade=texto(form,"prioridade");const situacao=texto(form,"situacao");
  const tenant=ctx.sessao.tenantId;
  const responsavel=await responsavelValido(ctx.db,tenant,texto(form,"responsavel_id",40));
  const {error}=await ctx.db.from("vitral_desenvolvimento").insert({
    tenant_id:tenant,titulo,modulo,descricao:opcional(texto(form,"descricao")),
    prioridade:PRIORIDADES.includes(prioridade)?prioridade:"media",
    situacao:SITUACOES.includes(situacao)?situacao:"planejado",
    responsavel_id:responsavel,criado_por:ctx.sessao.userId,
  });
  if(error)throw new Error("Não foi possível cadastrar a melhoria.");
  revalidatePath("/desenvolvimento");
}
export async function atualizarMelhoria(form:FormData){
  const ctx=await contexto();if(!ctx)return;
  const id=texto(form,"id",40);if(!/^[0-9a-f-]{36}$/i.test(id))return;
  const titulo=texto(form,"titulo",180),modulo=texto(form,"modulo",80);
  if(titulo.length<4||modulo.length<2)return;
  const prioridade=texto(form,"prioridade"),situacao=texto(form,"situacao");
  if(!PRIORIDADES.includes(prioridade)||!SITUACOES.includes(situacao))return;
  const prazo=texto(form,"prazo",10);
  if(prazo&&!/^\d{4}-\d{2}-\d{2}$/.test(prazo))return;
  const tenant=ctx.sessao.tenantId;
  const responsavel=await responsavelValido(ctx.db,tenant,texto(form,"responsavel_id",40));
  const {error}=await ctx.db.from("vitral_desenvolvimento").update({
    titulo,modulo,prioridade,situacao,descricao:opcional(texto(form,"descricao")),
    observacoes:opcional(texto(form,"observacoes",3500)),prazo:opcional(prazo),
    responsavel_id:responsavel,atualizado_em:new Date().toISOString()
  }).eq("tenant_id",tenant).eq("id",id);
  if(error)throw new Error("Não foi possível atualizar esta melhoria.");
  revalidatePath("/desenvolvimento");
}
