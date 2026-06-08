export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh-CN";

export const localeLabels: Record<Locale, string> = {
  "zh-CN": "中文",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function htmlLang(locale: Locale) {
  return locale;
}

export function ogLocale(locale: Locale) {
  return locale === "zh-CN" ? "zh_CN" : "en_US";
}
