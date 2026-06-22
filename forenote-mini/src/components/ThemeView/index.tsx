import { PropsWithChildren } from 'react'
import { View } from '@tarojs/components'
import { ConfigProvider } from '@nutui/nutui-react-taro'
import { useTheme } from '../../hooks/useTheme'
import { useTabBarTheme } from '../../hooks/useTabBarTheme'

interface Props {
  className?: string
  /** tab 页传 true：让 tabBar 跟随主题换色 */
  tabBar?: boolean
}

// 所有页面的统一根容器。职责：
// 1. 注入 .app-page + 主题强制 class（theme-force-light/dark 或空=跟随系统）。
//    主题变量定义在 .app-page 上（见 app.scss），NutUI 弹层行内渲染于其内可继承。
// 2. ConfigProvider 把 NutUI 品牌主色覆盖为古典金。
// 3. tabBar=true 时驱动 tabBar 换色。
// 新页面一律用 ThemeView 包裹，即可自动获得暗黑适配 —— 见 README 开发规范。
export default function ThemeView({ className = '', tabBar = false, children }: PropsWithChildren<Props>) {
  const { theme, forceClass } = useTheme()
  useTabBarTheme(tabBar ? theme : null)
  return (
    <ConfigProvider
      theme={{
        nutuiColorPrimary: '#c9a96a',
        nutuiColorPrimaryStop1: '#d4ba84',
        nutuiColorPrimaryStop2: '#c9a96a'
      }}
    >
      <View className={`app-page ${forceClass} ${className}`}>
        {children}
      </View>
    </ConfigProvider>
  )
}
