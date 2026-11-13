import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Adresses IP locales : permet d'ouvrir l'app en dev depuis un téléphone sur le même Wi-Fi.
const ipsLocales = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: ipsLocales,
  experimental: {
    // Photos client et PDF de devis passent par des Server Actions.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
