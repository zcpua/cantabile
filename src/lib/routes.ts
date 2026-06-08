export {
  aboutPath as localizedAboutPath,
  articlePath as localizedArticlePath,
  articlesPath as localizedArticlesPath,
  composerPath as localizedComposerPath,
  composersPath as localizedComposersPath,
  homePath as localizedHomePath,
  performancesPath as localizedPerformancesPath,
  workPath as localizedWorkPath,
  worksPath as localizedWorksPath,
} from "@/i18n/routes";

export const routes = {
  home: "/",
  composers: "/composers",
  works: "/works",
  performances: "/performances",
  articles: "/articles",
  about: "/about",
};

export function composerPath(slug: string) {
  return `/composers/${slug}`;
}

export function workPath(slug: string) {
  return `/works/${slug}`;
}

export function articlePath(slug: string) {
  return `/articles/${slug}`;
}
