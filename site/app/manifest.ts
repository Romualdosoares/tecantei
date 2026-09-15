import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Te Cantei — Sua história virou música",
    short_name: "Te Cantei",
    description: "Crie uma música personalizada para presentear quem você ama.",
    start_url: "/",
    display: "standalone",
    background_color: "#090807",
    theme_color: "#090807",
    lang: "pt-BR",
    icons: [{ src: "/tecantei-logodourada.jpg", sizes: "any", type: "image/jpeg", purpose: "any" }],
  };
}
