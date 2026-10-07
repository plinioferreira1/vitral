import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    // Uma tela visitada fica guardada no navegador por 30 segundos: voltar
    // a ela nesse intervalo abre na hora, sem nova ida ao servidor. Toda
    // ação que salva (revalidatePath, avisar) descarta o que está guardado,
    // então quem salvou vê o dado novo imediatamente.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
