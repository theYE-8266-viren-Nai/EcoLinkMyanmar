import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata, Viewport } from "next";
import { RootProviders } from "@/providers/root-providers";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EcoLink Myanmar", template: "%s | EcoLink" },
  description: "Myanmar recycling guidance, partner-center directions, rewards and community environmental reporting.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

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
