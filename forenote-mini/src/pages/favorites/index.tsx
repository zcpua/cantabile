import { useRef, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Swipe, SwipeRef } from '@nutui/nutui-react-taro'
import { apiFavoriteList } from '../../services/api'
import { mapPerformance } from '../../data/mapper'
import { Performance } from '../../types'
import { removeFavorite as removeFavoriteStore } from '../../store'
import PerformanceCard from '../../components/PerformanceCard'
import ThemeView from '../../components/ThemeView'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

export default function Favorites() {
  usePageShare({ title: 'FORENOTE有谱 | 我的收藏' })
  const [list, setList] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const swipeRefs = useRef<Record<string, SwipeRef | null>>({})
  const openedId = useRef<string | null>(null)

  useDidShow(() => {
    setLoading(true)
    apiFavoriteList()
      .then(rows => setList(rows.map(mapPerformance)))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  })

  const removeFavorite = (item: Performance) => {
    const id = item.id
    swipeRefs.current[id]?.close()
    if (openedId.current === id) openedId.current = null
    setList(prev => prev.filter(p => p.id !== id))
    removeFavoriteStore(id)
      .then(() => Taro.showToast({ title: '已取消收藏', icon: 'none' }))
      .catch(() => {
        setList(prev => (prev.some(p => p.id === id) ? prev : [item, ...prev]))
        Taro.showToast({ title: '取消失败，请稍后再试', icon: 'none' })
      })
  }

  const handleSwipeOpen = (id: string) => {
    if (openedId.current && openedId.current !== id) {
      swipeRefs.current[openedId.current]?.close()
    }
    openedId.current = id
  }

  const handleSwipeClose = (id: string) => {
    if (openedId.current === id) openedId.current = null
  }

  return (
    <ThemeView className='fav-page'>
      <ScrollView scrollY className='fav'>
        {list.length === 0 ? (
          <View className='fav__empty'>
            <Text className='fav__empty-icon'>♪</Text>
            <Text className='fav__empty-text'>{loading ? '加载中…' : '还没有收藏的演出'}</Text>
            {!loading && <Text className='fav__empty-sub'>去首页发现喜欢的音乐会吧</Text>}
          </View>
        ) : (
          <View className='fav__list'>
            {list.map(p => (
              <Swipe
                key={p.id}
                ref={ref => { swipeRefs.current[p.id] = ref }}
                className='fav__swipe'
                rightAction={<View className='fav__delete'><Text className='fav__delete-text'>取消</Text></View>}
                onOpen={() => handleSwipeOpen(p.id)}
                onClose={() => handleSwipeClose(p.id)}
                onActionClick={() => removeFavorite(p)}
              >
                <PerformanceCard data={p} />
              </Swipe>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemeView>
  )
}
