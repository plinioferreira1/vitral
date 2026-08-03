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

const MENSAGEM_GENERICA = "Não foi possível completar a solicitação. Tente novamente em instantes.";

export function traduzirErroAuth(mensagem: string | null | undefined): string {
  if (!mensagem || typeof mensagem !== "string") return MENSAGEM_GENERICA;

  for (const [chave, traducao] of Object.entries(TRADUCOES)) {
    if (mensagem.includes(chave)) return traducao;
  }

  // Se a mensagem não parece um texto legível (ex: "{}", JSON cru,
  // erro de rede sem detalhe), não mostra isso pro usuário — mostra
  // a mensagem genérica em vez de um texto confuso.
  const pareceTextoLegivel = /[a-zA-ZÀ-ÿ]{3,}/.test(mensagem);
  if (!pareceTextoLegivel) return MENSAGEM_GENERICA;

  return mensagem;
}
