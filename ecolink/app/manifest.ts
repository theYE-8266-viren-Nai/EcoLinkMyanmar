import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoLink Myanmar",
    short_name: "EcoLink",
    description: "Yangon recycling map, reports, rewards, and community environmental action.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f7f7",
    theme_color: "#087c78",
    categories: ["navigation", "utilities", "lifestyle"],
    icons: [
      {
        src: "/ecolink-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/ecolink-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/ecolink-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
