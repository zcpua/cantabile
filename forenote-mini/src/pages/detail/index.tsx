import { useState, useEffect, useRef } from 'react'
import { View, Image, Text, ScrollView, Swiper, SwiperItem, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { fetchPerformanceById } from '../../store/performances'
import { Performance } from '../../types'
import { isFavorite, toggleFavorite } from '../../store'
import { getOpenid } from '../../services/auth'
import Icon from '../../components/Icon'
import ThemeView from '../../components/ThemeView'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

const CALENDAR_SCOPE = 'scope.addPhoneCalendar'

export default function Detail() {
  const router = useRouter()
  const id = router.params.id || ''
  const [perf, setPerf] = useState<Performance | undefined>(undefined)
  const [fav, setFav] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [tabIndex, setTabIndex] = useState(0)
  const audioRef = useRef<Taro.InnerAudioContext | null>(null)
  const tabs = ['演出介绍', '演奏者', '曲目']
  usePageShare({
    title: perf ? `${perf.title} | FORENOTE有谱` : 'FORENOTE有谱 | 演出详情',
    imageUrl: perf?.cover
  })

  useEffect(() => {
    fetchPerformanceById(id).then(p => {
      setPerf(p)
      Taro.setNavigationBarTitle({ title: p ? p.title : '演出详情' })
    })
    setFav(isFavorite(id))
  }, [id])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current.destroy()
      }
    }
  }, [])

  if (!perf) {
    return (
      <ThemeView className='detail'>
        <View className='detail__loading'><Text>加载中…</Text></View>
      </ThemeView>
    )
  }

  const onFav = () => {
    if (!getOpenid()) {
      Taro.navigateTo({ url: '/pages/login/index' })
      return
    }
    const added = toggleFavorite(perf.id)
    setFav(added)
    Taro.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
  }

  const playTrack = (trackId: string, url: string) => {
    if (audioRef.current) {
      audioRef.current.stop()
      audioRef.current.destroy()
      audioRef.current = null
    }
    if (playingId === trackId) {
      setPlayingId(null)
      return
    }
    const ctx = Taro.createInnerAudioContext()
    ctx.src = url
    ctx.autoplay = true
    ctx.onError(() => {
      Taro.showToast({ title: '试听音频不可用（示例）', icon: 'none' })
      setPlayingId(null)
    })
    ctx.onEnded(() => setPlayingId(null))
    audioRef.current = ctx
    setPlayingId(trackId)
  }

  const showCalendarAuthGuide = (retry: () => void) => {
    Taro.showModal({
      title: '需要日历权限',
      content: '请在设置中开启“添加到日历”权限，开启后可把演出时间加入系统日历。',
      confirmText: '去授权',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return
        Taro.openSetting({
          success: settingRes => {
            const authSetting = settingRes.authSetting as Taro.AuthSetting & Record<typeof CALENDAR_SCOPE, boolean | undefined>
            if (authSetting[CALENDAR_SCOPE]) {
              retry()
            }
          }
        })
      }
    })
  }

  const addToCalendar = () => {
    const [y, m, d] = perf.date.split('-').map(Number)
    const [hh, mm] = perf.time.split(':').map(Number)
    const start = new Date(y, m - 1, d, hh, mm).getTime() / 1000

    const doAdd = () => Taro.addPhoneCalendar({
      title: perf.title,
      startTime: start,
      endTime: String(start + 7200),
      location: `${perf.city} ${perf.venue}`,
      description: perf.intro,
      alarm: true,
      alarmOffset: 3600,
      success: () => Taro.showToast({ title: '已添加到日历', icon: 'success' }),
      fail: () => {
        Taro.getSetting({
          success: settingRes => {
            const authSetting = settingRes.authSetting as Taro.AuthSetting & Record<typeof CALENDAR_SCOPE, boolean | undefined>
            if (authSetting[CALENDAR_SCOPE] === false) {
              showCalendarAuthGuide(doAdd)
              return
            }
            Taro.showToast({ title: '添加失败或已取消', icon: 'none' })
          },
          fail: () => Taro.showToast({ title: '添加失败或已取消', icon: 'none' })
        })
      }
    })

    Taro.getSetting({
      success: settingRes => {
        const authSetting = settingRes.authSetting as Taro.AuthSetting & Record<typeof CALENDAR_SCOPE, boolean | undefined>
        if (authSetting[CALENDAR_SCOPE] === false) {
          showCalendarAuthGuide(doAdd)
          return
        }
        doAdd()
      },
      fail: doAdd
    })
  }

  const buyTicket = () => {
    Taro.setClipboardData({
      data: perf.ticketUrl,
      success: () => {
        Taro.showModal({
          title: '前往购票',
          content: `购票链接已复制：${perf.ticketUrl}  请在浏览器中打开`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  }

  return (
    <ThemeView className='detail'>
      <View className='detail__head'>
        <Text className='detail__title'>{perf.title}</Text>
        <View className='detail__tags'>
          <Text className='detail__tag'>{perf.date} {perf.time}</Text>
          <Text className='detail__tag'>{perf.city} · {perf.venue}</Text>
        </View>
      </View>

      <View className='detail__tabs'>
        {tabs.map((tab, index) => (
          <View
            key={tab}
            className={`detail__tab ${tabIndex === index ? 'detail__tab--active' : ''}`}
            onClick={() => setTabIndex(index)}
          >
            <Text className='detail__tab-text'>{tab}</Text>
          </View>
        ))}
      </View>

      <Swiper
        className='detail__swiper'
        current={tabIndex}
        onChange={e => setTabIndex(e.detail.current)}
        skipHiddenItemLayout
      >
        <SwiperItem className='detail__pane'>
          <ScrollView scrollY className='detail__pane-scroll'>
            <View className='detail__section'>
              <Image className='detail__cover' src={perf.cover} mode='aspectFill' />
              <Text className='detail__intro'>{perf.intro}</Text>
            </View>
            <View className='detail__spacer' />
          </ScrollView>
        </SwiperItem>

        <SwiperItem className='detail__pane'>
          <ScrollView scrollY className='detail__pane-scroll'>
            <View className='detail__section'>
              <ScrollView scrollX className='detail__performers'>
                {perf.performers.map(per => (
                  <View
                    key={per.id}
                    className='detail__performer'
                    onClick={() => Taro.navigateTo({ url: `/pages/performer/index?id=${per.id}` })}
                  >
                    <Image className='detail__performer-avatar' src={per.avatar} mode='aspectFill' />
                    <Text className='detail__performer-name'>{per.name}</Text>
                    <Text className='detail__performer-role'>{per.role}</Text>
                    <Text className='detail__performer-bio'>{per.bio}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View className='detail__spacer' />
          </ScrollView>
        </SwiperItem>

        <SwiperItem className='detail__pane'>
          <ScrollView scrollY className='detail__pane-scroll'>
            <View className='detail__section'>
              {perf.tracks.map(t => {
                const playing = playingId === t.id
                return (
                  <View key={t.id} className='detail__track' onClick={() => playTrack(t.id, t.audioUrl)}>
                    <View className={`detail__play ${playing ? 'detail__play--on' : ''}`}>
                      <Icon name={playing ? 'pause' : 'play'} size={28} color={playing ? '#fff' : '#1a1a2e'} />
                    </View>
                    <View className='detail__track-info'>
                      <Text className='detail__track-title'>{t.title}</Text>
                      <Text className='detail__track-composer'>{t.composer}</Text>
                    </View>
                    <Text className='detail__track-dur'>{t.duration}</Text>
                  </View>
                )
              })}
            </View>
            <View className='detail__spacer' />
          </ScrollView>
        </SwiperItem>
      </Swiper>

      <View className='detail__bar'>
        <View className='detail__bar-fav' onClick={onFav}>
          <Icon name={fav ? 'star-fill' : 'star'} size={48} color='#c9a96a' />
        </View>
        <Button className='detail__bar-btn detail__bar-share' openType='share'>
          <Icon name='message' size={36} color='#ffffff' />
          <Text className='detail__bar-btntext'>推荐</Text>
        </Button>
        <View className='detail__bar-btn' onClick={addToCalendar}>
          <Icon name='calendar-add' size={36} color='#ffffff' />
          <Text className='detail__bar-btntext'>加入日程</Text>
        </View>
        <View className='detail__bar-btn' onClick={buyTicket}>
          <Icon name='ticket' size={36} color='#ffffff' />
          <Text className='detail__bar-btntext'>去购票</Text>
        </View>
      </View>

    </ThemeView>
  )
}
