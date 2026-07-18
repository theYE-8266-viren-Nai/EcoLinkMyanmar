import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata, Viewport } from "next";
import { RootProviders } from "@/providers/root-providers";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "EcoLink Myanmar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EcoLink",
  },
  title: { default: "EcoLink Myanmar", template: "%s | EcoLink" },
  description: "Myanmar recycling guidance, partner-center directions, rewards and community environmental reporting.",
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/ecolink-icon-192.png",
    icon: [
      { url: "/ecolink-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/ecolink-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#087c78",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <RootProviders>{children}</RootProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
