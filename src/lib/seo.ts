import type { Metadata } from "next";
import { site } from "@/data/site";

export function pageTitle(title?: string) {
  return title ? `${title} | ${site.name}` : site.name;
}

export function pageMetadata(title: string, description: string, path = "/"): Metadata {
  const url = new URL(path, site.url).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle(title),
      description,
      url,
      siteName: site.name,
      type: "website",
      locale: "zh_CN",
    },
  };
}
