import type { Metadata } from "next";
import { RootProviders } from "@/providers/root-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoLink",
  description: "Turn Waste into Worth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
