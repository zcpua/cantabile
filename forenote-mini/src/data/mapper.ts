import { Performance, Performer, Track } from '../types'
import type { ApiPerformance } from '../services/api'
import { pad2 } from '../utils/date'

const SAMPLE_AUDIO = 'https://m701.music.126.net/sample.mp3'

// 把 ISO 时间戳转换为 Asia/Shanghai（+08:00）的墙上时间，拆成 date / time。
const splitShanghai = (iso: string): { date: string; time: string } => {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return { date: '', time: '' }
  const shanghai = new Date(t + 8 * 60 * 60 * 1000)
  const date = `${shanghai.getUTCFullYear()}-${pad2(shanghai.getUTCMonth() + 1)}-${pad2(shanghai.getUTCDate())}`
  const time = `${pad2(shanghai.getUTCHours())}:${pad2(shanghai.getUTCMinutes())}`
  return { date, time }
}

const parsePrice = (label?: string | null): number => {
  if (!label) return 0
  const m = label.match(/\d+/)
  return m ? Number(m[0]) : 0
}

const seededImage = (id: string) => `https://picsum.photos/seed/${encodeURIComponent(id)}/800/500`

const toPerformers = (artists: string[]): Performer[] =>
  artists.map((name, i) => ({
    id: name || `artist-${i}`,
    name,
    role: '',
    avatar: `https://picsum.photos/seed/${encodeURIComponent(name || `a${i}`)}/200/200`,
    bio: ''
  }))

const toTracks = (program: ApiPerformance['program']): Track[] =>
  program.map((p, i) => ({
    id: `${i}`,
    title: p.displayTitle,
    composer: '',
    duration: '',
    audioUrl: SAMPLE_AUDIO
  }))

export const mapPerformance = (p: ApiPerformance): Performance => {
  const { date, time } = splitShanghai(p.startsAt)
  return {
    id: p.id,
    title: p.title,
    cover: p.imageUrl || seededImage(p.id),
    venue: p.venue,
    city: p.city,
    date,
    time,
    priceFrom: parsePrice(p.priceLabel),
    intro: p.intro || '',
    ticketUrl: p.ticketUrl || p.sourceUrl,
    performers: toPerformers(p.artists || []),
    tracks: toTracks(p.program || [])
  }
}

// 后端无 banner/recommended 字段，客户端按启发式标注：
// 有封面图的前 N 条作 banner；未开演的作 recommended。
export const decoratePerformances = (list: Performance[], raw: ApiPerformance[]): Performance[] => {
  const now = Date.now()
  let bannerCount = 0
  return list.map((perf, i) => {
    const hasImage = !!raw[i]?.imageUrl
    const upcoming = Date.parse(raw[i]?.startsAt) >= now
    const banner = hasImage && bannerCount < 5
    if (banner) bannerCount++
    return { ...perf, banner, recommended: upcoming }
  })
}
