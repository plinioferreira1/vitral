import nodemailer from "nodemailer";

/**
 * Envia e-mail usando o SMTP do Zoho Mail. Credenciais vêm de
 * variáveis de ambiente (ZOHO_EMAIL_USER / ZOHO_EMAIL_APP_PASSWORD)
 * — nunca do código. Se não estiverem configuradas, lança erro
 * explicando o motivo (em vez de fingir que enviou).
 */
export async function enviarEmail({
  destinatarios,
  assunto,
  html,
}: {
  destinatarios: string[];
  assunto: string;
  html: string;
}) {
  const usuario = process.env.ZOHO_EMAIL_USER;
  const senha = process.env.ZOHO_EMAIL_APP_PASSWORD;

  if (!usuario || !senha) {
    throw new Error(
      "E-mail não configurado: faltam as variáveis ZOHO_EMAIL_USER / ZOHO_EMAIL_APP_PASSWORD."
    );
  }
  if (destinatarios.length === 0) {
    throw new Error("Nenhum destinatário cadastrado.");
  }

  const transportador = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: { user: usuario, pass: senha },
  });

  await transportador.sendMail({
    from: `Vitral — Sacra Netimóveis <${usuario}>`,
    to: destinatarios.join(", "),
    subject: assunto,
    html,
  });
}
