export const site = {
  name: "Cantabile 如歌",
  description:
    "面向古典音乐爱好者、初学者和演出观众的作曲家、作品与演出内容网站。",
  url: "https://cantabile.vercel.app",
};

export const navItems = [
  { href: "/composers", label: "作曲家" },
  { href: "/works", label: "作品" },
  { href: "/performances", label: "演出" },
  { href: "/articles", label: "专题" },
  { href: "/about", label: "关于" },
];

export const musicPeriods = [
  "巴洛克",
  "古典主义",
  "浪漫主义",
  "民族乐派",
  "印象主义",
  "现代主义",
  "当代",
] as const;

export const articleCategories = [
  "古典音乐入门",
  "作曲家指南",
  "作品导听",
  "演出观前指南",
] as const;
