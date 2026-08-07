import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Simply in Balance",
    short_name: "Simply",
    description: "Online leeromgeving en community van Simply in Balance.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f5ef",
    theme_color: "#5f7f6f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
