import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { initThemeWatcher } from './store/theme'
import { refreshProfile } from './services/auth'
import { hydrateFavorites } from './store'
import { loadPerformances } from './store/performances'
import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    initThemeWatcher()
    loadPerformances().catch(() => {})
    refreshProfile().then(() => hydrateFavorites())
  })

  return children
}

export default App
