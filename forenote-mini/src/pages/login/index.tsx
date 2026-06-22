import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { login } from '../../services/auth'
import { hydrateFavorites } from '../../store'
import ThemeView from '../../components/ThemeView'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

export default function Login() {
  usePageShare({ title: 'FORENOTE有谱 | 登录' })
  const [busy, setBusy] = useState(false)

  const doLogin = async () => {
    if (busy) return
    setBusy(true)
    const ok = await login()
    if (!ok) {
      setBusy(false)
      return
    }
    await hydrateFavorites()
    setBusy(false)
    Taro.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 600)
  }

  return (
    <ThemeView className='login'>
      <Image className='login__logo' src='https://picsum.photos/seed/music/200/200' mode='aspectFill' />
      <Text className='login__title'>欢迎来到FORENOTE有谱</Text>
      <Text className='login__sub'>登录以收藏演出、同步日程</Text>

      <View className='login__btn' onClick={doLogin}>
        <Text>{busy ? '登录中…' : '微信登录'}</Text>
      </View>
      <Text className='login__tip'>* 通过微信云托管获取身份，需在微信内打开</Text>
    </ThemeView>
  )
}
