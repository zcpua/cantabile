import { useMemo } from 'react'
import Taro from '@tarojs/taro'

export function useStatusBar(): number {
  return useMemo(() => {
    try {
      const info = Taro.getWindowInfo ? Taro.getWindowInfo() : Taro.getSystemInfoSync()
      return info.statusBarHeight || 20
    } catch {
      return 20
    }
  }, [])
}
