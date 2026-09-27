import type { StaticImageData } from "next/image";

import bancoDoBrasilLogo from "react-native-brazil-bank-icons/dist/icons/001-low.png";
import santanderLogo from "react-native-brazil-bank-icons/dist/icons/033-low.png";
import interLogo from "react-native-brazil-bank-icons/dist/icons/077-low.png";
import xpLogo from "react-native-brazil-bank-icons/dist/icons/102-low.png";
import caixaLogo from "react-native-brazil-bank-icons/dist/icons/104-low.png";
import stoneLogo from "react-native-brazil-bank-icons/dist/icons/197-low.png";
import btgLogo from "react-native-brazil-bank-icons/dist/icons/208-low.png";
import originalLogo from "react-native-brazil-bank-icons/dist/icons/212-low.png";
import bradescoLogo from "react-native-brazil-bank-icons/dist/icons/237-low.png";
import nubankLogo from "react-native-brazil-bank-icons/dist/icons/260-low.png";
import pagbankLogo from "react-native-brazil-bank-icons/dist/icons/290-low.png";
import mercadoPagoLogo from "react-native-brazil-bank-icons/dist/icons/323-low.png";
import c6Logo from "react-native-brazil-bank-icons/dist/icons/336-low.png";
import itauLogo from "react-native-brazil-bank-icons/dist/icons/341-low.png";
import safraLogo from "react-native-brazil-bank-icons/dist/icons/422-low.png";
import sicrediLogo from "react-native-brazil-bank-icons/dist/icons/748-low.png";
import sicoobLogo from "react-native-brazil-bank-icons/dist/icons/756-low.png";

export type BancoIdentidade = {
  sigla: string;
  nome: string;
  bg: string;
  fg: string;
  accent: string;
  logo?: StaticImageData | string;
  logoPadding?: number;
  border?: string;
  generico?: boolean;
};

const BANCO_DO_BRASIL: BancoIdentidade = {
  sigla: "BB",
  nome: "Banco do Brasil",
  bg: "#F8D117",
  fg: "#00338D",
  accent: "#00338D",
  logo: bancoDoBrasilLogo,
};

const BANCOS: Array<{ aliases: string[]; identidade: BancoIdentidade }> = [
  {
    aliases: ["banco do brasil", "banco brasil", "bb"],
    identidade: BANCO_DO_BRASIL,
  },
  {
    aliases: ["caixa economica", "caixa econômica", "caixa federal", "caixa"],
    identidade: {
      sigla: "Caixa",
      nome: "Caixa",
      bg: "#0070AD",
      fg: "#ffffff",
      accent: "#F58220",
      logo: caixaLogo,
    },
  },
  {
    aliases: ["banco inter", "inter"],
    identidade: {
      sigla: "Inter",
      nome: "Inter",
      bg: "#FF7A00",
      fg: "#ffffff",
      accent: "#FF7A00",
      logo: interLogo,
    },
  },
  {
    aliases: ["sicoob", "bancoob"],
    identidade: {
      sigla: "Sicoob",
      nome: "Sicoob",
      bg: "#00A650",
      fg: "#ffffff",
      accent: "#007C41",
      logo: sicoobLogo,
    },
  },
  {
    aliases: ["itau", "itaú"],
    identidade: {
      sigla: "Itaú",
      nome: "Itaú",
      bg: "#EC7000",
      fg: "#ffffff",
      accent: "#1F3C88",
      logo: itauLogo,
    },
  },
  {
    aliases: ["bradesco"],
    identidade: {
      sigla: "Bradesco",
      nome: "Bradesco",
      bg: "#CC092F",
      fg: "#ffffff",
      accent: "#CC092F",
      logo: bradescoLogo,
    },
  },
  {
    aliases: ["santander"],
    identidade: {
      sigla: "Santander",
      nome: "Santander",
      bg: "#EC0000",
      fg: "#ffffff",
      accent: "#EC0000",
      logo: santanderLogo,
    },
  },
  {
    aliases: ["nubank", "nu pagamentos"],
    identidade: {
      sigla: "Nu",
      nome: "Nubank",
      bg: "#820AD1",
      fg: "#ffffff",
      accent: "#820AD1",
      logo: nubankLogo,
    },
  },
  {
    aliases: ["sicredi"],
    identidade: {
      sigla: "Sicredi",
      nome: "Sicredi",
      bg: "#6AB023",
      fg: "#ffffff",
      accent: "#3F7E1F",
      logo: sicrediLogo,
    },
  },
  {
    aliases: ["banco original", "original"],
    identidade: {
      sigla: "Original",
      nome: "Original",
      bg: "#00AA4F",
      fg: "#ffffff",
      accent: "#007A37",
      logo: originalLogo,
    },
  },
  {
    aliases: ["btg pactual", "btg"],
    identidade: {
      sigla: "BTG",
      nome: "BTG Pactual",
      bg: "#0B2A4A",
      fg: "#ffffff",
      accent: "#153F68",
      logo: btgLogo,
    },
  },
  {
    aliases: ["safra"],
    identidade: {
      sigla: "Safra",
      nome: "Safra",
      bg: "#00263A",
      fg: "#ffffff",
      accent: "#0B3C5D",
      logo: safraLogo,
    },
  },
  {
    aliases: ["c6 bank", "c6"],
    identidade: {
      sigla: "C6",
      nome: "C6 Bank",
      bg: "#1A1A1A",
      fg: "#ffffff",
      accent: "#262626",
      logo: c6Logo,
    },
  },
  {
    aliases: ["pagseguro", "pagbank"],
    identidade: {
      sigla: "PagBank",
      nome: "PagBank",
      bg: "#FFC801",
      fg: "#0B0B0B",
      accent: "#FFC801",
      logo: pagbankLogo,
    },
  },
  {
    aliases: ["mercado pago", "mercadopago"],
    identidade: {
      sigla: "Mercado Pago",
      nome: "Mercado Pago",
      bg: "#00AAEF",
      fg: "#ffffff",
      accent: "#008DD2",
      logo: mercadoPagoLogo,
    },
  },
  {
    aliases: ["xp investimentos", "xp"],
    identidade: {
      sigla: "XP",
      nome: "XP",
      bg: "#111111",
      fg: "#F7C948",
      accent: "#111111",
      logo: xpLogo,
    },
  },
  {
    aliases: ["stone"],
    identidade: {
      sigla: "Stone",
      nome: "Stone",
      bg: "#00A868",
      fg: "#ffffff",
      accent: "#007D4D",
      logo: stoneLogo,
    },
  },
];

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function combinaAlias(chave: string, aliasOriginal: string) {
  const alias = normalizar(aliasOriginal);
  if (alias.length <= 3) {
    const palavras = chave.split(/\s+/);
    return chave === alias || palavras.includes(alias) || chave.includes(`banco ${alias}`);
  }
  return chave.includes(alias);
}

export function identidadeBanco(nomeBanco: string | null | undefined): BancoIdentidade {
  const nome = (nomeBanco ?? "").trim();
  const chave = normalizar(nome);
  for (const banco of BANCOS) {
    if (banco.aliases.some((alias) => combinaAlias(chave, alias))) return banco.identidade;
  }
  const iniciais = (nome || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    sigla: iniciais || "?",
    nome: nome || "Banco",
    bg: "#E7E2DC",
    fg: "#4A4038",
    accent: "#F4F0EA",
    border: "#D8CFC6",
    generico: true,
  };
}
