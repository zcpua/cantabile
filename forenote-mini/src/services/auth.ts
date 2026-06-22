import Taro from '@tarojs/taro'
import { apiLogin, apiProfile, apiUpdateProfile, ApiError, type MeUser } from './api'
import { getUser, setUser, logout as clearUser } from '../store'

const OPENID_KEY = 'me_openid'

export const getOpenid = (): string | undefined => {
  const v = Taro.getStorageSync(OPENID_KEY)
  return typeof v === 'string' && v ? v : undefined
}

const writeOpenid = (id?: string) => {
  if (id) Taro.setStorageSync(OPENID_KEY, id)
  else Taro.removeStorageSync(OPENID_KEY)
}

// 后端 MeUser → 本地 UserInfo。signature 后端不存，沿用本地已有值。
const applyMe = (u: MeUser | null, openid: string, fallbackNick = '音乐爱好者') => {
  const prev = getUser()
  setUser({
    nickName: u?.nickname || prev?.nickName || fallbackNick,
    avatarUrl: u?.avatarUrl || prev?.avatarUrl || 'https://picsum.photos/seed/user/200/200',
    signature: prev?.signature || ''
  })
  writeOpenid(openid)
}

/**
 * 触发登录：openid-only。云托管网关在 callContainer 请求上自动注入
 * X-WX-OPENID，无需 wx.login + AppSecret，也无需头像昵称授权。
 * 返回是否登录成功。
 */
export const login = async (nickname?: string): Promise<boolean> => {
  try {
    const r = await apiLogin(nickname ? { nickname } : undefined)
    applyMe(r.user, r.openid, nickname || '音乐爱好者')
    return true
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      Taro.showModal({
        title: '需要在微信内打开',
        content: '云托管登录依赖微信网关，请在微信小程序内试试。',
        showCancel: false
      })
    } else {
      Taro.showToast({ title: '登录失败，请稍后再试', icon: 'none' })
    }
    return false
  }
}

export const logout = () => {
  clearUser()
  writeOpenid(undefined)
}

/**
 * 完善资料：昵称直接传；头像传 chooseImage 拿到的临时文件路径，这里读成
 * base64 data URL 交给后端上传。signature 仅本地保存。
 */
export const updateProfile = async (input: {
  nickname?: string
  signature?: string
  avatarTempPath?: string
}): Promise<boolean> => {
  let avatarBase64: string | undefined
  const prev = getUser()
  // 头像没变化（仍是已保存的那张）时不重复上传；否则一律按本地临时文件读取。
  // 微信 chooseAvatar 在开发者工具里返回 http://tmp/ 开头的临时路径，
  // 不能用 http(s) 前缀来判断是否需要上传。
  const avatarChanged = !!input.avatarTempPath && input.avatarTempPath !== prev?.avatarUrl
  if (avatarChanged) {
    try {
      const fs = Taro.getFileSystemManager()
      const base64 = fs.readFileSync(input.avatarTempPath!, 'base64') as string
      const ext = input.avatarTempPath!.split('?')[0].split('.').pop()?.toLowerCase()
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
      avatarBase64 = `data:${mime};base64,${base64}`
    } catch (e) {
      Taro.showToast({ title: '读取头像失败', icon: 'none' })
      return false
    }
  }
  try {
    const r = await apiUpdateProfile({ nickname: input.nickname, avatarBase64 })
    setUser({
      nickName: r.user?.nickname || input.nickname || prev?.nickName || '音乐爱好者',
      avatarUrl: r.user?.avatarUrl || prev?.avatarUrl || 'https://picsum.photos/seed/user/200/200',
      signature: input.signature ?? prev?.signature ?? ''
    })
    writeOpenid(r.openid)
    return true
  } catch (e) {
    const msg = e instanceof ApiError ? `保存失败(${e.status})` : '保存失败，请稍后再试'
    Taro.showToast({ title: msg, icon: 'none' })
    console.error('[updateProfile] failed', e)
    return false
  }
}

/** 冷启动 / 进入「我的」时拉一次 /me/profile，把后端用户态同步到本地。 */
export const refreshProfile = async (): Promise<void> => {
  try {
    const r = await apiProfile()
    if (r.user) {
      applyMe(r.user, r.openid)
    }
  } catch {
    // 不在微信内 / 无签名头：保留本地缓存即可。
  }
}
