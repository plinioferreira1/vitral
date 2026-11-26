import { botaoEmailSacra, EMAIL_SACRA, escaparHtmlEmail, layoutEmailSacra } from "@/lib/email-layout-sacra";

/** "MARK ANTHONY da SILVA" → "Mark" (primeiro nome com só a inicial maiúscula). */
export function primeiroNome(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return primeiro ? primeiro.charAt(0).toLocaleUpperCase("pt-BR") + primeiro.slice(1).toLocaleLowerCase("pt-BR") : "";
}

/** Assunto com o endereço do imóvel (o código interno só entra se não houver endereço). */
export function assuntoEmailAssinatura(endereco: string | null, codigo: string): string {
  const imovel = (endereco ?? "").replace(/\s+/g, " ").trim();
  const curto = imovel.length > 90 ? `${imovel.slice(0, 87).trimEnd()}…` : imovel;
  return `Termo de Entrega de Chaves para assinatura – ${curto || codigo}`;
}

/** E-mail ao cliente com o link pessoal de assinatura do termo. Função pura. */
export function emailAssinaturaTermo(d: { nome: string; papel: "vendedor" | "comprador" | string; endereco: string | null; codigo: string; link: string }) {
  const nome = primeiroNome(d.nome);
  const papel = d.papel === "comprador" ? "Comprador(a)" : d.papel === "vendedor" ? "Vendedor(a)" : "";
  const imovel = (d.endereco ?? "").trim();
  const assunto = assuntoEmailAssinatura(d.endereco, d.codigo);

  const texto = [
    `Olá${nome ? `, ${nome}` : ""}.`,
    "",
    `Segue o link para conferir e assinar eletronicamente o Termo de Entrega de Chaves e Proporcionalidade${imovel ? ` do imóvel ${imovel}` : ""}:`,
    "",
    d.link,
    "",
    "O link é pessoal e intransferível. Em caso de dúvida, responda a este e-mail.",
    "",
    "Sacra Netimóveis",
  ].join("\n");

  const linha = (rotulo: string, valor: string) =>
    `<tr><td style="padding:8px 0;color:${EMAIL_SACRA.secundario};font-size:12px;width:110px;vertical-align:top;">${escaparHtmlEmail(rotulo)}</td><td style="padding:8px 0;font-size:14px;color:${EMAIL_SACRA.texto};font-weight:600;">${escaparHtmlEmail(valor)}</td></tr>`;

  const conteudo = `
    <p style="margin:0 0 14px;font-size:15px;">Olá${nome ? `, <strong>${escaparHtmlEmail(nome)}</strong>` : ""}.</p>
    <p style="margin:0 0 18px;">O Termo de Entrega de Chaves e Proporcionalidade está pronto para você conferir e assinar eletronicamente.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${EMAIL_SACRA.borda};border-bottom:1px solid ${EMAIL_SACRA.borda};margin:0 0 22px;">
      ${imovel ? linha("Imóvel", imovel) : ""}
      ${linha("Assinante", `${d.nome.trim()}${papel ? ` · ${papel}` : ""}`)}
    </table>
    ${botaoEmailSacra("Conferir e assinar o termo", d.link)}
    <p style="margin:18px 0 0;font-size:12px;line-height:18px;color:${EMAIL_SACRA.secundario};">Se o botão não abrir, copie e cole este endereço no navegador:<br/>
      <a href="${escaparHtmlEmail(d.link)}" style="color:${EMAIL_SACRA.vinho};word-break:break-all;">${escaparHtmlEmail(d.link)}</a></p>
    <p style="margin:18px 0 0;font-size:12px;line-height:18px;color:${EMAIL_SACRA.secundario};">O link é pessoal e intransferível. Em caso de dúvida, é só responder a este e-mail.</p>`;

  const html = layoutEmailSacra("Assinatura eletrônica", "Termo de Entrega de Chaves", conteudo, "", 640, true);
  return { assunto, texto, html };
}
