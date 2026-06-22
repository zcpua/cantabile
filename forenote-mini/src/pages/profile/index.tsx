import { useState, useEffect } from 'react'
import { View, Input, Text, Image, Textarea, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getUser } from '../../store'
import { updateProfile } from '../../services/auth'
import ThemeView from '../../components/ThemeView'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

const DEFAULT_AVATAR = 'https://picsum.photos/seed/user/200/200'

export default function Profile() {
  usePageShare({ title: 'FORENOTE有谱 | 修改资料' })
  const [nick, setNick] = useState('')
  const [sign, setSign] = useState('')
  const [avatar, setAvatar] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (u) {
      setNick(u.nickName)
      setSign(u.signature)
      setAvatar(u.avatarUrl)
    }
  }, [])

  // 微信「头像填写」能力：从微信资料里选择头像，拿到临时文件路径。
  const onChooseAvatar = (e: { detail: { avatarUrl: string } }) => {
    setAvatar(e.detail.avatarUrl)
  }

  const save = async () => {
    if (busy) return
    if (!nick.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    setBusy(true)
    const ok = await updateProfile({
      nickname: nick.trim(),
      signature: sign.trim(),
      avatarTempPath: avatar || undefined
    })
    setBusy(false)
    if (!ok) return
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 600)
  }

  return (
    <ThemeView className='profile'>
      <Button className='profile__avatar-btn' openType='chooseAvatar' onChooseAvatar={onChooseAvatar}>
        <Image
          className='profile__avatar'
          src={avatar || DEFAULT_AVATAR}
          mode='aspectFill'
        />
        <Text className='profile__avatar-tip'>点击使用微信头像</Text>
      </Button>

      <View className='profile__field'>
        <Text className='profile__label'>昵称</Text>
        <Input
          className='profile__input'
          type='nickname'
          placeholder='点击填写微信昵称'
          value={nick}
          onInput={e => setNick(e.detail.value)}
          onBlur={e => setNick(e.detail.value)}
        />
      </View>

      <View className='profile__field profile__field--col'>
        <Text className='profile__label'>个性签名</Text>
        <Textarea
          className='profile__textarea'
          placeholder='写点什么吧…'
          value={sign}
          maxlength={50}
          onInput={e => setSign(e.detail.value)}
        />
      </View>

      <View className='profile__btn' onClick={save}>
        <Text>{busy ? '保存中…' : '保 存'}</Text>
      </View>
    </ThemeView>
  )
}
