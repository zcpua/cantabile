import { useMemo } from 'react'
import { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'

type ShareOptions = {
  title?: string
  imageUrl?: string
}

const DEFAULT_TITLE = 'FORENOTE有谱'

const buildQuery = (params: Record<string, string | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`)
    .join('&')

export function usePageShare(options: ShareOptions = {}) {
  const router = useRouter()

  const shareData = useMemo(() => {
    const routePath = router.path.startsWith('/') ? router.path : `/${router.path}`
    const query = buildQuery(router.params)
    const path = query ? `${routePath}?${query}` : routePath

    return {
      title: options.title || DEFAULT_TITLE,
      path,
      query,
      imageUrl: options.imageUrl
    }
  }, [options.imageUrl, options.title, router.params, router.path])

  useShareAppMessage(() => ({
    title: shareData.title,
    path: shareData.path,
    imageUrl: shareData.imageUrl
  }))

  useShareTimeline(() => ({
    title: shareData.title,
    query: shareData.query,
    imageUrl: shareData.imageUrl
  }))
}
