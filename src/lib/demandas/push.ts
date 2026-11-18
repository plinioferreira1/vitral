import {
  createECDH, createHmac, createCipheriv, createPrivateKey, randomBytes, sign,
} from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type AssinaturaPush={endpoint:string;p256dh:string;auth_secret:string};
export const VAPID_PUBLIC_KEY=process.env.VAPID_PUBLIC_KEY??"";
const b64url=(v:Buffer)=>v.toString("base64url");
const decode=(v:string)=>Buffer.from(v,"base64url");
const hmac=(key:Buffer,data:Buffer)=>createHmac("sha256",key).update(data).digest();
const info=(s:string)=>Buffer.from(s+"\0","utf8");
function expand(prk:Buffer,ctx:Buffer,n:number):Buffer{
  return hmac(prk,Buffer.concat([ctx,Buffer.from([1])])).subarray(0,n);
}

/** Somente endpoints dos principais serviços Push: evita SSRF a endereços arbitrários. */
export function endpointValido(endpoint:string):boolean{
  try{
    const url=new URL(endpoint);
    if(url.protocol!=="https:"||url.username||url.password||url.port)return false;
    const h=url.hostname.toLowerCase();
    return h==="fcm.googleapis.com"||h==="fcm-xm.googleapis.com"||
      h==="updates.push.services.mozilla.com"||
      h==="web.push.apple.com"||h.endsWith(".push.apple.com")||
      h==="wns.windows.com"||h.endsWith(".notify.windows.com");
  }catch{return false;}
}

function jwtVapid(endpoint:string):string{
  const pub=decode(VAPID_PUBLIC_KEY);
  const priv=decode(process.env.VAPID_PRIVATE_KEY??"");
  if(pub.length!==65||priv.length!==32)throw new Error("VAPID sem configuração válida");
  const key=createPrivateKey({format:"jwk",key:{
    kty:"EC",crv:"P-256",x:b64url(pub.subarray(1,33)),y:b64url(pub.subarray(33,65)),d:b64url(priv),
  }});
  const cabecalho=b64url(Buffer.from(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const body=b64url(Buffer.from(JSON.stringify({
    aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+12*3600,
    sub:process.env.VAPID_SUBJECT||"mailto:locacao@sacraimoveis.com.br",
  })));
  const signed=cabecalho+"."+body;
  const assinatura=sign("sha256",Buffer.from(signed),{key,dsaEncoding:"ieee-p1363"});
  return signed+"."+b64url(assinatura);
}

/** Payload criptografado segundo RFC 8291 (aes128gcm), sem dependências externas. */
export function cifrarPush(subscription:AssinaturaPush,payload:object):Buffer{
  const publicClient=decode(subscription.p256dh);
  const auth=decode(subscription.auth_secret);
  if(publicClient.length!==65||auth.length!==16)throw new Error("Chaves inválidas do dispositivo");
  const ecdh=createECDH("prime256v1");
  ecdh.generateKeys();
  const publicServer=ecdh.getPublicKey(undefined,"uncompressed");
  const shared=ecdh.computeSecret(publicClient);
  const prk=hmac(auth,shared);
  const keyInfo=Buffer.concat([info("WebPush: info"),publicClient,publicServer]);
  const ikm=expand(prk,keyInfo,32);
  const salt=randomBytes(16);
  const prkSalt=hmac(salt,ikm);
  const cek=expand(prkSalt,info("Content-Encoding: aes128gcm"),16);
  const nonce=expand(prkSalt,info("Content-Encoding: nonce"),12);
  const plain=Buffer.concat([Buffer.from(JSON.stringify(payload),"utf8"),Buffer.from([2])]);
  const cipher=createCipheriv("aes-128-gcm",cek,nonce);
  const encrypted=Buffer.concat([cipher.update(plain),cipher.final(),cipher.getAuthTag()]);
  const header=Buffer.alloc(21);
  salt.copy(header,0);
  header.writeUInt32BE(4096,16);
  header[20]=65;
  return Buffer.concat([header,publicServer,encrypted]);
}

async function disparar(sub:AssinaturaPush,id:string,msg:object):Promise<number>{
  if(!endpointValido(sub.endpoint))return 400;
  const body=cifrarPush(sub,msg);
  const response=await fetch(sub.endpoint,{
    method:"POST",signal:AbortSignal.timeout(10000),
    headers:{
      Authorization:"vapid t="+jwtVapid(sub.endpoint)+", k="+VAPID_PUBLIC_KEY,
      "Content-Encoding":"aes128gcm",
      "Content-Type":"application/octet-stream",
      TTL:"360",
      Urgency:"normal",
    },
    body:new Uint8Array(body),
  });
  return response.status;
}

/** Falha de push nunca desfaz a demanda criada: a notificação interna persiste no banco. */
export async function notificarPush(tenantId:string,usuarioId:string,demandaId:string,tipo="Nova atividade"){
  if(!process.env.VAPID_PRIVATE_KEY||!VAPID_PUBLIC_KEY)return;
  try{
    const db=createAdminClient();
    const {data}=await db.from("demandas_push_assinaturas")
      .select("id,endpoint,p256dh,auth_secret").eq("tenant_id",tenantId).eq("usuario_id",usuarioId).limit(12);
    await Promise.all((data??[]).map(async sub=>{
      try{
        const status=await disparar(sub,sub.id,{title:"VITRAL · "+tipo,body:"Abra a Central de Demandas para acompanhar.",url:"/demandas/"+demandaId});
        if(status===404||status===410){
          await db.from("demandas_push_assinaturas").delete().eq("id",sub.id).eq("tenant_id",tenantId);
        }
      }catch(e){console.error("Falha ao entregar notificação push:",e instanceof Error?e.message:"erro");}
    }));
  }catch(e){console.error("Falha no envio push:",e instanceof Error?e.message:"erro");}
}
