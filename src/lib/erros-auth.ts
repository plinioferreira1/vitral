const TRADUCOES: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "E-mail ainda não confirmado.",
  "User already registered": "Já existe uma conta com esse e-mail.",
  "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
  "Unable to validate email address: invalid format": "E-mail em formato inválido.",
  "For security purposes, you can only request this after": "Por segurança, aguarde um pouco antes de tentar de novo.",
  "Signup requires a valid password": "É preciso informar uma senha válida.",
  "User not found": "Não encontramos uma conta com esse e-mail.",
};

export function traduzirErroAuth(mensagem: string): string {
  for (const [chave, traducao] of Object.entries(TRADUCOES)) {
    if (mensagem.includes(chave)) return traducao;
  }
  return mensagem;
}
