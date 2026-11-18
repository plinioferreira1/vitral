/** Identidade de e-mails da Sacra Netimóveis — uso exclusivo do servidor. */
export const EMAIL_SACRA = {
  vinho: "#731515",
  dourado: "#D28C2C",
  fundo: "#F5F3F0",
  texto: "#24201F",
  secundario: "#746D68",
  borda: "#E8E2DB",
} as const;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://vitral.sacraimoveis.com.br").replace(/\/$/, "");
const LOGO = `${SITE}/brand/sacra-logo-horizontal-bordo.png`;

export function escaparHtmlEmail(valor: unknown): string {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Cabeçalho com a marca oficial hospedada no próprio VITRAL; também funciona sem carregar imagens. */
export function cabecalhoEmailSacra(area: string, titulo: string, subtitulo = ""): string {
  return `<tr><td style="background:#ffffff;padding:20px 26px;border-bottom:3px solid ${EMAIL_SACRA.dourado};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
    <td align="left" style="vertical-align:middle;"><img src="${LOGO}" width="154" alt="Sacra Netimóveis" style="width:154px;max-width:100%;height:auto;display:block;border:0;color:${EMAIL_SACRA.vinho};font-size:14px;font-weight:700;" /></td>
    <td align="right" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1px;font-weight:700;color:${EMAIL_SACRA.vinho};">VITRAL</td>
    </tr></table></td></tr>
    <tr><td style="background:${EMAIL_SACRA.vinho};padding:24px 26px;">
    <div style="font-size:11px;line-height:16px;letter-spacing:1.2px;color:#F2D5A4;font-weight:700;text-transform:uppercase;">${escaparHtmlEmail(area)}</div>
    <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:32px;font-weight:700;margin:9px 0 5px;color:#ffffff;">${escaparHtmlEmail(titulo)}</h1>
    ${subtitulo ? `<p style="font-size:13px;line-height:20px;margin:0;color:#F8E9E9;">${escaparHtmlEmail(subtitulo)}</p>` : ""}
    </td></tr>`;
}

export function rodapeEmailSacra(): string {
  return `<tr><td style="padding:19px 26px;background:#ffffff;border-top:1px solid ${EMAIL_SACRA.borda};text-align:center;font-family:Arial,Helvetica,sans-serif;color:${EMAIL_SACRA.secundario};font-size:11px;line-height:18px;">
    VITRAL · Gestão de Processos Inteligente<br/>Sacra Netimóveis · Mensagem automática
  </td></tr>`;
}

export function botaoEmailSacra(texto: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${EMAIL_SACRA.vinho}" style="border-radius:7px;">
    <a href="${escaparHtmlEmail(url)}" style="display:inline-block;padding:13px 20px;background:${EMAIL_SACRA.vinho};border-radius:7px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:20px;">${escaparHtmlEmail(texto)}</a>
  </td></tr></table>`;
}

/** Tabelas de apresentação e CSS inline são compatíveis com Gmail e Outlook. */
export function layoutEmailSacra(area: string, titulo: string, conteudo: string, subtitulo = "", largura = 720): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body style="margin:0;padding:0;background:${EMAIL_SACRA.fundo};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${EMAIL_SACRA.fundo};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_SACRA.texto};">
  <tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${largura}px;background:#ffffff;border:1px solid ${EMAIL_SACRA.borda};border-radius:12px;overflow:hidden;">
  ${cabecalhoEmailSacra(area,titulo,subtitulo)}
  <tr><td style="padding:24px 26px;font-size:14px;line-height:22px;">${conteudo}</td></tr>
  ${rodapeEmailSacra()}
  </table></td></tr></table></body></html>`;
}
