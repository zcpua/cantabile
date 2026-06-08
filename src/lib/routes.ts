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
