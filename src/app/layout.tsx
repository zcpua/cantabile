import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/data/site";
import { defaultLocale, ogLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { homePath, localeAlternates } from "@/i18n/routes";
import "./globals.css";

const sans = Noto_Sans_SC({
  variable: "--font-sans-cn",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const serif = Noto_Serif_SC({
  variable: "--font-serif-cn",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const dictionary = getDictionary(defaultLocale);

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${dictionary.site.name} - ${dictionary.pages.composers.title}、${dictionary.pages.works.title}与${dictionary.pages.performances.title}`,
    template: `%s | ${dictionary.site.name}`,
  },
  description: dictionary.site.description,
  alternates: {
    canonical: "/",
    languages: localeAlternates(homePath),
  },
  openGraph: {
    title: `${dictionary.site.name} - ${dictionary.pages.composers.title}、${dictionary.pages.works.title}与${dictionary.pages.performances.title}`,
    description: dictionary.site.description,
    url: site.url,
    siteName: dictionary.site.name,
    type: "website",
    locale: ogLocale(defaultLocale),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
