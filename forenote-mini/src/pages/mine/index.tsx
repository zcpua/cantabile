import { useState } from 'react'
import { View, Image, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getUser, getFavorites, getFollows, hydrateFavorites } from '../../store'
import { refreshProfile, logout } from '../../services/auth'
import { getThemePref, setThemePref, THEME_LABEL, ThemePref } from '../../store/theme'
import { UserInfo } from '../../types'
import Icon from '../../components/Icon'
import ThemeView from '../../components/ThemeView'
import { useStatusBar } from '../../hooks/useStatusBar'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

const GROUP_URL = 'https://work.weixin.qq.com/gm/83b9eec90f067761bcf761a8e09e3dbd'

export default function Mine() {
  usePageShare({ title: 'FORENOTE有谱 | 我的' })
  const statusBar = useStatusBar()
  const [user, setUserState] = useState<UserInfo | null>(null)
  const [favCount, setFavCount] = useState(0)
  const [followCount, setFollowCount] = useState(0)
  const [pref, setPref] = useState<ThemePref>(getThemePref())

  const refresh = () => {
    setUserState(getUser())
    setFavCount(getFavorites().length)
    setFollowCount(getFollows().length)
    setPref(getThemePref())
  }

  useDidShow(() => {
    refresh()
    // 从后端同步用户态与收藏，完成后再刷一次。
    Promise.all([refreshProfile(), hydrateFavorites()]).then(refresh)
  })

  const chooseTheme = () => {
    const order: ThemePref[] = ['system', 'light', 'dark']
    Taro.showActionSheet({
      itemList: order.map(p => THEME_LABEL[p]),
      success: res => {
        const next = order[res.tapIndex]
        setThemePref(next)
        setPref(next)
      },
      fail: () => {}
    })
  }

  const goLogin = () => {
    if (user) {
      Taro.navigateTo({ url: '/pages/profile/index' })
    } else {
      Taro.navigateTo({ url: '/pages/login/index' })
    }
  }

  const goFavorites = () => {
    Taro.navigateTo({ url: '/pages/favorites/index' })
  }

  const goFollows = () => {
    Taro.navigateTo({ url: '/pages/follows/index' })
  }

  const onLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: res => {
        if (!res.confirm) return
        logout()
        refresh()
        Taro.showToast({ title: '已退出', icon: 'none' })
      }
    })
  }

  const onJoinGroupComplete = (e: { detail: { errcode: number; notifytype: number } }) => {
    const { errcode } = e.detail
    if (errcode === 0) return
    const msg: Record<number, string> = {
      [-3009]: '群聊已满员',
      [-3010]: '群聊已解散',
      [-3011]: '你已被该群拉黑',
      [-3012]: '群聊已满员'
    }
    if (msg[errcode]) {
      Taro.showToast({ title: msg[errcode], icon: 'none' })
    }
  }

  return (
    <ThemeView className='mine' tabBar>
      <View className='mine__header' style={{ paddingTop: `${statusBar + 40}px` }}>
        <View className='mine__profile' onClick={goLogin}>
          <Image
            className='mine__avatar'
            src={user?.avatarUrl || 'https://picsum.photos/seed/guest/200/200'}
            mode='aspectFill'
          />
          <View className='mine__info'>
            <Text className='mine__name'>{user ? user.nickName : '点击登录'}</Text>
            <Text className='mine__sign'>
              {user ? (user.signature || '编辑个人资料 ›') : '登录后收藏与同步演出日程'}
            </Text>
          </View>
        </View>
      </View>

      <View className='mine__stats'>
        <View className='mine__stat' onClick={goFavorites}>
          <Text className='mine__stat-num'>{favCount}</Text>
          <Text className='mine__stat-label'>我的收藏</Text>
        </View>
        <View className='mine__stat' onClick={goFollows}>
          <Text className='mine__stat-num'>{followCount}</Text>
          <Text className='mine__stat-label'>我的关注</Text>
        </View>
      </View>

      <View className='mine__menu'>
        <View className='mine__item' onClick={chooseTheme}>
          <Icon name='moon' size={40} color='#c9a96a' className='mine__item-icon' />
          <Text className='mine__item-label'>系统主题</Text>
          <Text className='mine__item-extra'>{THEME_LABEL[pref]}</Text>
          <Icon name='chevron-right' size={32} color='#c0c0c8' />
        </View>
        <View className='mine__item mine__item--plugin'>
          <Icon name='users' size={40} color='#c9a96a' className='mine__item-icon' />
          <Text className='mine__item-label'>加群交流</Text>
          <Icon name='chevron-right' size={32} color='#c0c0c8' />
          <View className='mine__plugin-hit'>
            <cell
              url={GROUP_URL}
              contactText=' '
              paddingStyle={0}
              onCompletemessage={onJoinGroupComplete}
            />
          </View>
        </View>
      </View>

      {user && (
        <View className='mine__logout' onClick={onLogout}>
          <Icon name='logout' size={36} color='#e05555' />
          <Text className='mine__logout-text'>退出登录</Text>
        </View>
      )}
    </ThemeView>
  )
}
