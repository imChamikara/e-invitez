import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { siteConfig } from "@/config/site";
import { getLang } from "@/i18n/server";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: "Beautiful shareable invitation pages for weddings, homecomings, birthdays and more.",
  openGraph: { siteName: siteConfig.name, type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteConfig.colors.brand,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  const c = siteConfig.colors;
  const brandVars = {
    "--brand": c.brand,
    "--brand-dark": c.brandDark,
    "--brand-soft": c.brandSoft,
    "--ink": c.ink,
    "--paper": c.paper,
  } as CSSProperties;

  return (
    <html lang={lang} className={fontVariables} style={brandVars}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
