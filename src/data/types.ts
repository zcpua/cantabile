export type MusicPeriod =
  | "巴洛克"
  | "古典主义"
  | "浪漫主义"
  | "民族乐派"
  | "印象主义"
  | "现代主义"
  | "当代";

export type Composer = {
  id: string;
  slug: string;
  name: string;
  nameCn: string;
  birthYear: number;
  deathYear?: number;
  country: string;
  period: MusicPeriod;
  portraitUrl: string;
  shortBio: string;
  bio: string;
  styleTags: string[];
  timeline: { year: number; event: string }[];
  starterWorkIds: string[];
  relatedComposerIds: string[];
  featured?: boolean;
};

export type Work = {
  id: string;
  slug: string;
  composerId: string;
  title: string;
  titleCn: string;
  year?: number;
  genre: string;
  period: MusicPeriod;
  description: string;
  movements?: string[];
  listeningLinks: { platform: string; url: string }[];
  featured?: boolean;
};

export type Performance = {
  id: string;
  title: string;
  city: string;
  venue: string;
  startsAt: string;
  artists: string[];
  program: { composerId?: string; workId?: string; displayTitle: string }[];
  ticketUrl?: string;
  sourceUrl: string;
  sourceName: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  category: string;
  publishedAt: string;
  content: string;
  relatedComposerIds?: string[];
  relatedWorkIds?: string[];
};
