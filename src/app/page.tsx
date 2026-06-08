export const dynamic = "force-dynamic";

import { HomePage } from "@/app/_localized/home-page";
import { defaultLocale } from "@/i18n/config";

export default async function Home() {
  return <HomePage locale={defaultLocale} />;
}
