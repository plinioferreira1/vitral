import {describe,it,expect} from "vitest";
import {createECDH,createHmac,createDecipheriv} from "node:crypto";
import {cifrarPush,endpointValido} from "../push";

const hmac=(key:Buffer,value:Buffer)=>createHmac("sha256",key).update(value).digest();
const expand=(key:Buffer,ctx:string|Buffer,n:number)=>hmac(key,Buffer.concat([Buffer.isBuffer(ctx)?ctx:Buffer.from(ctx+"\0"),Buffer.from([1])])).subarray(0,n);
describe("Notificações push de demandas",()=>{
  it("aceita somente provedores de push HTTPS conhecidos",()=>{
    expect(endpointValido("https://fcm.googleapis.com/fcm/send/demo")).toBe(true);
    expect(endpointValido("https://updates.push.services.mozilla.com/wpush/v2/demo")).toBe(true);
    expect(endpointValido("http://127.0.0.1/internal")).toBe(false);
    expect(endpointValido("https://fcm.googleapis.com.attacker.example/")).toBe(false);
    expect(endpointValido("https://username:password@fcm.googleapis.com/")).toBe(false);
  });
  it("criptografa payload legível pelo navegador via RFC 8291",()=>{
    const cliente=createECDH("prime256v1");cliente.generateKeys();
    const pub=cliente.getPublicKey();
    const auth=Buffer.alloc(16,37);
    const pacote=cifrarPush({endpoint:"https://fcm.googleapis.com/fcm/send/demo",p256dh:pub.toString("base64url"),auth_secret:auth.toString("base64url")},{title:"VITRAL",url:"/demandas"});
    expect(pacote.length).toBeGreaterThan(110);
    const salt=pacote.subarray(0,16);
    const size=pacote.readUInt32BE(16);
    expect(size).toBe(4096);
    expect(pacote[20]).toBe(65);
    const serverPub=pacote.subarray(21,86);
    const ikm=expand(hmac(auth,cliente.computeSecret(serverPub)),Buffer.concat([Buffer.from("WebPush: info\0"),pub,serverPub]),32);
    const prk=hmac(salt,ikm);
    const cek=expand(prk,"Content-Encoding: aes128gcm",16);
    const nonce=expand(prk,"Content-Encoding: nonce",12);
    const encrypted=pacote.subarray(86);
    const decipher=createDecipheriv("aes-128-gcm",cek,nonce);
    decipher.setAuthTag(encrypted.subarray(encrypted.length-16));
    const plain=Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]);
    expect(plain[plain.length-1]).toBe(2);
    expect(JSON.parse(plain.subarray(0,-1).toString())).toEqual({title:"VITRAL",url:"/demandas"});
  });
});
