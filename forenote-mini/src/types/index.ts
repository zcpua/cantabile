export interface Performer {
  id: string
  name: string
  role: string
  avatar: string
  bio: string
  works?: string[]
  relatedIds?: string[]
  recommended?: boolean
}

export interface Track {
  id: string
  title: string
  composer: string
  duration: string
  audioUrl: string
}

export interface Performance {
  id: string
  title: string
  cover: string
  venue: string
  city: string
  date: string
  time: string
  priceFrom: number
  intro: string
  banner?: boolean
  recommended?: boolean
  ticketUrl: string
  performers: Performer[]
  tracks: Track[]
}

export interface UserInfo {
  nickName: string
  avatarUrl: string
  signature: string
}
