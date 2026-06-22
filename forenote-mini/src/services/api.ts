import Taro from '@tarojs/taro'

/**
 * 微信云托管接入信息，通过 `.env.{development,production}` 注入：
 *   TARO_APP_WX_CLOUD_ENV=prod-xxxx
 *   TARO_APP_WX_CLOUD_SERVICE=forenote
 */
export const WX_CLOUD_ENV = __APP_WX_CLOUD_ENV__
export const WX_CLOUD_SERVICE = __APP_WX_CLOUD_SERVICE__

console.log('[api config]', { WX_CLOUD_ENV, WX_CLOUD_SERVICE })

let cloudReady: Promise<void> | null = null
const ensureCloud = (): Promise<void> => {
  if (cloudReady) return cloudReady
  cloudReady = new Promise<void>((resolve, reject) => {
    try {
      // 多次调用 init 仅首次生效。新版 Taro.cloud.init 同步返回 void。
      const r = Taro.cloud.init({ env: WX_CLOUD_ENV || undefined }) as unknown as Promise<void> | void
      if (r && typeof (r as Promise<void>).then === 'function') {
        (r as Promise<void>).then(resolve).catch(reject)
      } else {
        resolve()
      }
    } catch (e) {
      reject(e)
    }
  })
  return cloudReady
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export class ApiError extends Error {
  status: number
  payload: unknown
  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

/**
 * 统一请求方法。微信小程序端一律走 callContainer：由云托管网关注入
 * X-WX-OPENID，本地调试容器同样适用，登录才能拿到真实 openid。
 */
async function request<T>(path: string, method: Method = 'GET', data?: unknown): Promise<T> {
  await ensureCloud()
  const r = await Taro.cloud.callContainer({
    config: WX_CLOUD_ENV ? { env: WX_CLOUD_ENV } : undefined,
    path,
    method,
    data: data as object | undefined,
    header: { 'X-WX-SERVICE': WX_CLOUD_SERVICE, 'content-type': 'application/json' },
    timeout: 15000,
  })
  if (r.statusCode >= 200 && r.statusCode < 300) return r.data as T
  throw new ApiError(r.statusCode, `请求失败 ${r.statusCode}`, r.data)
}

export const api = {
  get: <T>(path: string) => request<T>(path, 'GET'),
  post: <T>(path: string, data?: unknown) => request<T>(path, 'POST', data),
  patch: <T>(path: string, data?: unknown) => request<T>(path, 'PATCH', data),
  del: <T>(path: string) => request<T>(path, 'DELETE'),
}

const BASE = '/api/v2'

// ---- Performance ----
export type ApiPerformance = {
  id: string
  title: string
  city: string
  venue: string
  startsAt: string
  artists: string[]
  program: { composerId?: string; workId?: string; displayTitle: string }[]
  ticketUrl?: string | null
  sourceUrl: string
  sourceName: string
  imageUrl?: string | null
  priceLabel?: string | null
  saleStatus?: string | null
  address?: string | null
  intro?: string | null
  isClassical?: boolean | null
}

export const fetchPerformances = () => api.get<ApiPerformance[]>(`${BASE}/performances`)
export const fetchBannerPerformances = () => api.get<ApiPerformance[]>(`${BASE}/banners`)
export const fetchPerformance = (id: string) =>
  api.get<ApiPerformance>(`${BASE}/performances/${encodeURIComponent(id)}`)

// ---- /me/* ----
export type MeUser = {
  openid: string
  unionid?: string | null
  nickname?: string | null
  avatarUrl?: string | null
}

export const apiLogin = (profile?: { nickname?: string; avatarUrl?: string }) =>
  api.post<{ openid: string; unionid?: string | null; user: MeUser }>(`${BASE}/me/login`, profile || {})

export const apiProfile = () => api.get<{ openid: string; user: MeUser | null }>(`${BASE}/me/profile`)

export const apiUpdateProfile = (data: { nickname?: string; avatarBase64?: string }) =>
  api.patch<{ openid: string; user: MeUser }>(`${BASE}/me/profile`, data)

export const apiFavoriteIds = () => api.get<{ ids: string[] }>(`${BASE}/me/favorites/ids`)
export const apiFavoriteList = () => api.get<ApiPerformance[]>(`${BASE}/me/favorites`)
export const apiAddFavorite = (id: string) =>
  api.post<{ ok: true }>(`${BASE}/me/favorites/${encodeURIComponent(id)}`)
export const apiRemoveFavorite = (id: string) =>
  api.del<{ ok: true }>(`${BASE}/me/favorites/${encodeURIComponent(id)}`)
