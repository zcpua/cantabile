import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Theme } from '../store/theme'

const ICON: Record<string, string> = {
  home: 'assets/tab/home.png',
  calendar: 'assets/tab/calendar.png',
  mine: 'assets/tab/mine.png'
}
const ICON_DARK: Record<string, string> = {
  home: 'assets/tab/home_dark.png',
  calendar: 'assets/tab/calendar_dark.png',
  mine: 'assets/tab/mine_dark.png'
}
const ICON_ON: Record<string, string> = {
  home: 'assets/tab/home_on.png',
  calendar: 'assets/tab/calendar_on.png',
  mine: 'assets/tab/mine_on.png'
}
const ORDER = ['home', 'calendar', 'mine']

// theme=null 时不操作（非 tab 页）。tab 页传入实际主题，驱动 tabBar 换色换图标。
export function useTabBarTheme(theme: Theme | null) {
  useEffect(() => {
    if (!theme) return
    Taro.setTabBarStyle?.({
      color: theme === 'dark' ? '#8a8a96' : '#999999',
      selectedColor: '#c9a96a',
      backgroundColor: theme === 'dark' ? '#1c1c26' : '#ffffff',
      borderStyle: theme === 'dark' ? 'white' : 'black'
    })
    ORDER.forEach((key, index) => {
      Taro.setTabBarItem?.({
        index,
        iconPath: theme === 'dark' ? ICON_DARK[key] : ICON[key],
        selectedIconPath: ICON_ON[key]
      })
    })
  }, [theme])
}
