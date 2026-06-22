import { useMemo } from 'react'
import { View, Image, Text, Swiper, SwiperItem, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useBannerPerformances, usePerformances } from '../../store/performances'
import PerformanceCard from '../../components/PerformanceCard'
import ThemeView from '../../components/ThemeView'
import { useStatusBar } from '../../hooks/useStatusBar'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

export default function Index() {
  usePageShare({ title: 'FORENOTE有谱 | 发现值得珍藏的演出' })
  const statusBar = useStatusBar()
  const { list, loading } = usePerformances()
  const { list: banners } = useBannerPerformances()

  const recommended = useMemo(() => list.filter(p => p.recommended), [list])

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${id}` })
  }

  return (
    <ThemeView className='home-page' tabBar>
      <ScrollView scrollY className='home'>
      <View className='home__header' style={{ paddingTop: `${statusBar + 16}px` }}>
        <Text className='home__brand'>FORENOTE有谱</Text>
        <Text className='home__slogan'>遇见每一场值得珍藏的演出</Text>
      </View>

      <Swiper
        className='home__banner'
        circular
        autoplay
        interval={4000}
        indicatorDots
        indicatorActiveColor='#c9a96a'
        indicatorColor='rgba(255,255,255,0.5)'
      >
        {banners.map(b => (
          <SwiperItem key={b.id} onClick={() => goDetail(b.id)}>
            <View className='home__banner-item'>
              <Image className='home__banner-img' src={b.cover} mode='aspectFill' />
              <View className='home__banner-mask'>
                <Text className='home__banner-title'>{b.title}</Text>
                <Text className='home__banner-meta'>{b.date} · {b.city}</Text>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      <View className='home__section'>
        <Text className='home__section-title'>为你推荐</Text>
      </View>

      <View className='home__list'>
        {recommended.map(p => (
          <PerformanceCard key={p.id} data={p} />
        ))}
        {recommended.length === 0 && (
          <View className='home__empty'>
            <Text>{loading ? '加载中…' : '没有找到相关演出'}</Text>
          </View>
        )}
      </View>
      </ScrollView>
    </ThemeView>
  )
}
