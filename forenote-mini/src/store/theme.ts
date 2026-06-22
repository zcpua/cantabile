import Taro from '@tarojs/taro'

export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const PREF_KEY = 'themePref'

type Listener = () => void
const listeners = new Set<Listener>()

function detectSystemTheme(): Theme {
  try {
    const info = Taro.getAppBaseInfo
      ? Taro.getAppBaseInfo()
      : Taro.getSystemInfoSync()
    return (info.theme as Theme) || 'light'
  } catch {
    return 'light'
  }
}

let systemTheme: Theme = detectSystemTheme()

let watching = false
export function initThemeWatcher() {
  if (watching) return
  watching = true
  systemTheme = detectSystemTheme()
  Taro.onThemeChange?.(({ theme }) => {
    systemTheme = theme as Theme
    emit()
  })
}

function emit() {
  listeners.forEach(fn => fn())
}

export function subscribeTheme(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getThemePref(): ThemePref {
  return (Taro.getStorageSync(PREF_KEY) as ThemePref) || 'system'
}

export function setThemePref(pref: ThemePref) {
  Taro.setStorageSync(PREF_KEY, pref)
  emit()
}

// 生效主题：tabBar 等原生元素无法用 CSS 媒体查询，需要明确知道当前是浅是深。
// 页面视觉则不依赖这个值，而是交给 CSS（见 app.scss）。
export function resolveTheme(): Theme {
  const pref = getThemePref()
  if (pref === 'system') return systemTheme
  return pref
}

// 页面根容器要挂的强制 class：
// system → 空（交给 @media prefers-color-scheme 自动跟随）
// light/dark → 强制覆盖
export function forceClass(pref: ThemePref = getThemePref()): string {
  if (pref === 'light') return 'theme-force-light'
  if (pref === 'dark') return 'theme-force-dark'
  return ''
}

export const THEME_LABEL: Record<ThemePref, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色'
}
