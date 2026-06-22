import { useEffect, useState } from 'react'
import { fetchPerformances, fetchPerformance, fetchBannerPerformances } from '../services/api'
import { mapPerformance, decoratePerformances } from '../data/mapper'
import { Performance } from '../types'

let cache: Performance[] = []
let inflight: Promise<Performance[]> | null = null
let bannerCache: Performance[] = []
let bannerInflight: Promise<Performance[]> | null = null

type Listener = () => void
const listeners = new Set<Listener>()
const emit = () => listeners.forEach(fn => fn())
const bannerListeners = new Set<Listener>()
const emitBanners = () => bannerListeners.forEach(fn => fn())

export const getCachedPerformances = () => cache
export const getCachedBanners = () => bannerCache

/** 拉取演出列表（带模块级缓存）。重复调用复用同一个 Promise。 */
export function loadPerformances(force = false): Promise<Performance[]> {
  if (!force && cache.length) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = fetchPerformances()
    .then(raw => {
      cache = decoratePerformances(raw.map(mapPerformance), raw)
      emit()
      return cache
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** 拉取首页 banner：数据源为管理员用户收藏的演出。 */
export function loadBannerPerformances(force = false): Promise<Performance[]> {
  if (!force && bannerCache.length) return Promise.resolve(bannerCache)
  if (bannerInflight) return bannerInflight
  bannerInflight = fetchBannerPerformances()
    .then(raw => {
      bannerCache = raw.map(item => ({ ...mapPerformance(item), banner: true }))
      emitBanners()
      return bannerCache
    })
    .finally(() => {
      bannerInflight = null
    })
  return bannerInflight
}

export function usePerformances(): { list: Performance[]; loading: boolean } {
  const [list, setList] = useState<Performance[]>(cache)
  const [loading, setLoading] = useState(cache.length === 0)

  useEffect(() => {
    const sync = () => setList([...cache])
    listeners.add(sync)
    loadPerformances()
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => {
      listeners.delete(sync)
    }
  }, [])

  return { list, loading }
}

export function useBannerPerformances(): { list: Performance[]; loading: boolean } {
  const [list, setList] = useState<Performance[]>(bannerCache)
  const [loading, setLoading] = useState(bannerCache.length === 0)

  useEffect(() => {
    const sync = () => setList([...bannerCache])
    bannerListeners.add(sync)
    loadBannerPerformances()
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => {
      bannerListeners.delete(sync)
    }
  }, [])

  return { list, loading }
}

export function getPerformanceById(id: string): Performance | undefined {
  return cache.find(p => p.id === id) || bannerCache.find(p => p.id === id)
}

/** 详情页用：缓存命中直接返回，否则单独拉取并合入缓存。 */
export async function fetchPerformanceById(id: string): Promise<Performance | undefined> {
  const hit = getPerformanceById(id)
  if (hit) return hit
  try {
    const raw = await fetchPerformance(id)
    const mapped = mapPerformance(raw)
    cache = [...cache, mapped]
    emit()
    return mapped
  } catch {
    return undefined
  }
}

export function getPerformancesByDate(date: string): Performance[] {
  return cache.filter(p => p.date === date)
}

export function getPerformancesByPerformer(performerName: string): Performance[] {
  return cache.filter(p => p.performers.some(per => per.name === performerName || per.id === performerName))
}
