import { defaultLocale, type Locale } from "../config";
import { en } from "./en";
import { zhCN } from "./zh-CN";

type WidenLiterals<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : T extends readonly (infer Item)[]
    ? readonly WidenLiterals<Item>[]
    : T extends object
      ? { [Key in keyof T]: WidenLiterals<T[Key]> }
      : T extends string
        ? string
        : T;

export type Dictionary = WidenLiterals<typeof zhCN>;

export const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zhCN,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
