import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({ sessao:vi.fn(), alvo:vi.fn(), single:vi.fn(), update:vi.fn(), select:vi.fn(), eq:vi.fn(), admin:vi.fn(), auth:vi.fn(), aviso:vi.fn(), revalidate:vi.fn() }));
vi.mock("@/lib/usuario-atual",()=>({getUsuarioAtual:m.sessao,GESTORES:["diretor","gerente"]}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({from:()=>({select:()=>({eq:()=>({single:m.alvo})})})})}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:m.admin}));
vi.mock("@/lib/aviso",()=>({avisar:m.aviso,checar:async(op:Promise<{error:unknown}>)=>!(await op).error}));
vi.mock("next/navigation",()=>({redirect:()=>{throw new Error("redirect");}}));
vi.mock("next/cache",()=>({revalidatePath:m.revalidate}));
vi.mock("@/lib/site-url",()=>({obterSiteUrl:async()=>"https://vitral.test"}));
import { editarNomeMembro, editarEmailMembro } from "./actions";
function form(chave:string,valor:string){const f=new FormData();f.set("usuario_id","alvo");f.set(chave,valor);return f;}
beforeEach(()=>{
 vi.clearAllMocks();
 m.sessao.mockResolvedValue({user:{id:"gestor"},usuario:{tenant_id:"empresa",nivel_acesso:"diretor",ativo:true}});
 m.alvo.mockResolvedValue({data:{tenant_id:"empresa",ativo:true}});
 const cadeia={update:m.update,select:m.select,eq:m.eq,single:m.single};
 m.update.mockReturnValue(cadeia);m.select.mockReturnValue(cadeia);m.eq.mockReturnValue(cadeia);
 m.single.mockResolvedValue({data:{id:"alvo",email:"novo@example.com"},error:null});
 m.admin.mockReturnValue({from:()=>cadeia,auth:{admin:{updateUserById:m.auth}}});
 m.auth.mockResolvedValue({error:null});
});
describe("edição administrativa de identidade",()=>{
 it("grava nome com cliente administrativo após conferir empresa e exige uma linha",async()=>{
  expect(await editarNomeMembro(form("novo_nome"," Nome corrigido "))).toBe(true);
  expect(m.update).toHaveBeenCalledWith({nome:"Nome corrigido"});expect(m.eq).toHaveBeenCalledWith("tenant_id","empresa");expect(m.select).toHaveBeenCalledWith("id");expect(m.single).toHaveBeenCalled();expect(m.revalidate).toHaveBeenCalledWith("/","layout");
 });
 it("não informa sucesso quando nenhuma linha pôde ser gravada",async()=>{
  m.single.mockResolvedValue({data:null,error:{code:"PGRST116"}});
  expect(await editarNomeMembro(form("novo_nome","Nome"))).toBeUndefined();expect(m.aviso).not.toHaveBeenCalledWith("sucesso",expect.any(String));
 });
 it("não usa admin para alvo de outra empresa",async()=>{
  m.alvo.mockResolvedValue({data:{tenant_id:"outra"}});
  await expect(editarNomeMembro(form("novo_nome","Nome"))).rejects.toThrow("redirect");expect(m.admin).not.toHaveBeenCalled();
 });
 it("bloqueia usuário sem nível administrativo antes de usar admin",async()=>{
  m.sessao.mockResolvedValue({user:{id:"corretor"},usuario:{tenant_id:"empresa",nivel_acesso:"corretor",ativo:true}});
  await expect(editarEmailMembro(form("novo_email","novo@example.com"))).rejects.toThrow("redirect");expect(m.admin).not.toHaveBeenCalled();
 });
 it("confirma e-mail sincronizado com o login e revalida o layout",async()=>{
  expect(await editarEmailMembro(form("novo_email"," NOVO@EXAMPLE.COM "))).toBe(true);
  expect(m.auth).toHaveBeenCalledWith("alvo",{email:"novo@example.com",email_confirm:true});expect(m.update).not.toHaveBeenCalled();expect(m.eq).toHaveBeenCalledWith("tenant_id","empresa");expect(m.revalidate).toHaveBeenCalledWith("/","layout");
 });
 it("não informa sucesso se cadastro ainda divergir do login",async()=>{
  m.single.mockResolvedValue({data:{email:"antigo@example.com"},error:null});
  expect(await editarEmailMembro(form("novo_email","novo@example.com"))).toBeUndefined();expect(m.aviso).toHaveBeenCalledWith("erro",expect.stringContaining("confirmar"));
 });
 it("rejeita erro do Auth antes de consultar a confirmação",async()=>{
  m.auth.mockResolvedValue({error:{message:"E-mail já cadastrado"}});
  await expect(editarEmailMembro(form("novo_email","novo@example.com"))).rejects.toThrow("redirect");expect(m.single).not.toHaveBeenCalled();
 });
});
