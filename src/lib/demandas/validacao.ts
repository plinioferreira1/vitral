/** Validação usada antes de distribuir tarefas por texto ou áudio. */
export type TarefaRevisada = {
  titulo:string;
  descricao:string|null;
  responsavel_id:string;
  prazo:string|null;
  prioridade:string;
};
export type ErroTarefa = { indice:number; campos:string[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function dataValida(data:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data))return false;
  const [ano,mes,dia]=data.split("-").map(Number);
  if(ano<2000||ano>2100)return false;
  const d=new Date(Date.UTC(ano,mes-1,dia));
  return d.getUTCFullYear()===ano&&d.getUTCMonth()===mes-1&&d.getUTCDate()===dia;
}
export function validarTarefa(t:TarefaRevisada):string[]{
  const erros:string[]=[];
  const titulo=t.titulo.trim();
  if(titulo.length<4||titulo.length>180)erros.push("Título: informe de 4 a 180 caracteres");
  if(!UUID.test(t.responsavel_id))erros.push("Escolha um responsável");
  if(t.prazo && !dataValida(t.prazo))erros.push("Prazo inválido");
  if(!["baixa","normal","alta","urgente"].includes(t.prioridade))erros.push("Prioridade inválida");
  if((t.descricao??"").length>5000)erros.push("Descrição muito longa");
  return erros;
}
export function validarLote(tarefas:TarefaRevisada[]):ErroTarefa[]{
  return tarefas.map((t,indice)=>({indice,campos:validarTarefa(t)})).filter(t=>t.campos.length>0);
}
