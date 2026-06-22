import { useEffect, useState } from 'react'
import { resolveTheme, subscribeTheme, getThemePref, forceClass, Theme, ThemePref } from '../store/theme'

interface ThemeState {
  theme: Theme        // 实际生效的浅/深（用于 tabBar 等原生元素）
  pref: ThemePref     // 用户偏好（用于设置项回显）
  forceClass: string  // 页面根要挂的强制 class
}

export function useTheme(): ThemeState {
  const read = (): ThemeState => ({
    theme: resolveTheme(),
    pref: getThemePref(),
    forceClass: forceClass()
  })
  const [state, setState] = useState<ThemeState>(read)
  useEffect(() => {
    setState(read())
    return subscribeTheme(() => setState(read()))
  }, [])
  return state
}
