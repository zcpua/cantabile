import { Performer } from '../types'

export const PERFORMERS: Performer[] = [
  {
    id: 'p1',
    name: '李云迪',
    role: '钢琴',
    avatar: 'https://picsum.photos/seed/pianist/200/200',
    bio: '国际知名钢琴家，肖邦国际钢琴比赛冠军，以诗意细腻的演绎著称。自幼习琴，师承名家，被誉为“钢琴诗人”。',
    works: ['肖邦夜曲全集', '李斯特钢琴作品集', '柴可夫斯基第一钢琴协奏曲'],
    relatedIds: ['p3'],
    recommended: true
  },
  {
    id: 'p2',
    name: '吕思清',
    role: '小提琴',
    avatar: 'https://picsum.photos/seed/violin/200/200',
    bio: '帕格尼尼国际小提琴比赛金奖得主，演奏技巧精湛，音色温暖。是首位获此殊荣的东方人。',
    works: ['梁祝小提琴协奏曲', '帕格尼尼随想曲', '四季'],
    relatedIds: ['p3', 'p4'],
    recommended: true
  },
  {
    id: 'p3',
    name: '余隆',
    role: '指挥',
    avatar: 'https://picsum.photos/seed/conductor/200/200',
    bio: '著名指挥家，中国爱乐乐团艺术总监，多次执棒国际顶级乐团，致力于推广中国交响乐。',
    works: ['贝多芬交响曲全集', '马勒第二交响曲', '春之祭'],
    relatedIds: ['p1', 'p2', 'p4'],
    recommended: true
  },
  {
    id: 'p4',
    name: '王健',
    role: '大提琴',
    avatar: 'https://picsum.photos/seed/cello/200/200',
    bio: '享誉国际的大提琴演奏家，以深沉醇厚的音色闻名，巴赫无伴奏组曲的权威诠释者。',
    works: ['巴赫无伴奏大提琴组曲', '德沃夏克大提琴协奏曲', '埃尔加大提琴协奏曲'],
    relatedIds: ['p2', 'p3'],
    recommended: true
  }
]

export function getPerformerById(id: string): Performer | undefined {
  return PERFORMERS.find(p => p.id === id)
}

export function getRelatedPerformers(id: string): Performer[] {
  const p = getPerformerById(id)
  if (!p?.relatedIds) return []
  return p.relatedIds
    .map(getPerformerById)
    .filter((x): x is Performer => !!x)
}
