import { defaultLocale, locales, type Locale } from "./config";

export const routeSegments = {
  composers: "composers",
  works: "works",
  performances: "performances",
  articles: "articles",
  about: "about",
};

export function homePath(locale: Locale = defaultLocale) {
  return `/${locale}`;
}

export function rootPath() {
  return "/";
}

export function composersPath(locale: Locale = defaultLocale) {
  return `/${locale}/${routeSegments.composers}`;
}

export function composerPath(locale: Locale, slug: string) {
  return `${composersPath(locale)}/${slug}`;
}

export function worksPath(locale: Locale = defaultLocale) {
  return `/${locale}/${routeSegments.works}`;
}

export function workPath(locale: Locale, slug: string) {
  return `${worksPath(locale)}/${slug}`;
}

export function performancesPath(locale: Locale = defaultLocale) {
  return `/${locale}/${routeSegments.performances}`;
}

export function articlesPath(locale: Locale = defaultLocale) {
  return `/${locale}/${routeSegments.articles}`;
}

export function articlePath(locale: Locale, slug: string) {
  return `${articlesPath(locale)}/${slug}`;
}

export function aboutPath(locale: Locale = defaultLocale) {
  return `/${locale}/${routeSegments.about}`;
}

export function switchLocalePath(pathname: string, nextLocale: Locale) {
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length) {
    return homePath(nextLocale);
  }

  if (locales.includes(segments[0] as Locale)) {
    return `/${[nextLocale, ...segments.slice(1)].join("/")}`;
  }

  return `/${[nextLocale, ...segments].join("/")}`;
}

export function localeAlternates(pathBuilder: (locale: Locale) => string) {
  return Object.fromEntries(locales.map((locale) => [locale, pathBuilder(locale)]));
}

export const routes = {
  home: homePath(defaultLocale),
  composers: composersPath(defaultLocale),
  works: worksPath(defaultLocale),
  performances: performancesPath(defaultLocale),
  articles: articlesPath(defaultLocale),
  about: aboutPath(defaultLocale),
};
