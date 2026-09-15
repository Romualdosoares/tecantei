import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/auth/", "/criar", "/entrar", "/pedidos/", "/presente/", "/suporte/"],
    },
    sitemap: "https://tecantei.vercel.app/sitemap.xml",
    host: "https://tecantei.vercel.app",
  };
}
