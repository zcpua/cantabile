import { useState, useEffect } from 'react'
import { View, Image, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getPerformerById, getRelatedPerformers } from '../../data/performers'
import { getPerformancesByPerformer } from '../../store/performances'
import { Performer, Performance } from '../../types'
import { isFollowing, toggleFollow } from '../../store'
import Icon from '../../components/Icon'
import ThemeView from '../../components/ThemeView'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

export default function PerformerPage() {
  const router = useRouter()
  const id = router.params.id || ''
  const [performer, setPerformer] = useState<Performer | undefined>(undefined)
  const [related, setRelated] = useState<Performer[]>([])
  const [shows, setShows] = useState<Performance[]>([])
  const [following, setFollowing] = useState(false)
  usePageShare({
    title: performer ? `${performer.name} | FORENOTE有谱` : 'FORENOTE有谱 | 演奏家',
    imageUrl: performer?.avatar
  })

  useEffect(() => {
    const p = getPerformerById(id)
    setPerformer(p)
    setRelated(getRelatedPerformers(id))
    setShows(getPerformancesByPerformer(id))
    setFollowing(isFollowing(id))
    Taro.setNavigationBarTitle({ title: p ? p.name : '演奏家' })
  }, [id])

  if (!performer) {
    return (
      <ThemeView className='performer'>
        <View className='performer__loading'><Text>加载中…</Text></View>
      </ThemeView>
    )
  }

  const onFollow = () => {
    const added = toggleFollow(performer.id)
    setFollowing(added)
    Taro.showToast({ title: added ? '已关注' : '已取消关注', icon: 'none' })
  }

  const goPerformer = (pid: string) => {
    Taro.navigateTo({ url: `/pages/performer/index?id=${pid}` })
  }

  const goDetail = (pid: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${pid}` })
  }

  return (
    <ThemeView className='performer'>
      <ScrollView scrollY className='performer__scroll'>
        <View className='performer__hero'>
          <Image className='performer__avatar' src={performer.avatar} mode='aspectFill' />
          <Text className='performer__name'>{performer.name}</Text>
          <Text className='performer__role'>{performer.role}</Text>
          <View
            className={`performer__follow ${following ? 'performer__follow--on' : ''}`}
            onClick={onFollow}
          >
            <Icon name={following ? 'star-fill' : 'star'} size={32} color={following ? '#fff' : '#c9a96a'} />
            <Text className='performer__follow-text'>{following ? '已关注' : '关注'}</Text>
          </View>
        </View>

        <View className='performer__section'>
          <Text className='performer__section-title'>简介</Text>
          <Text className='performer__bio'>{performer.bio}</Text>
        </View>

        {performer.works && performer.works.length > 0 && (
          <View className='performer__section'>
            <Text className='performer__section-title'>代表作品</Text>
            {performer.works.map(w => (
              <View key={w} className='performer__work'>
                <Icon name='music' size={32} color='#c9a96a' className='performer__work-icon' />
                <Text className='performer__work-name'>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {related.length > 0 && (
          <View className='performer__section'>
            <Text className='performer__section-title'>相关人物</Text>
            <ScrollView scrollX className='performer__related'>
              {related.map(r => (
                <View key={r.id} className='performer__related-item' onClick={() => goPerformer(r.id)}>
                  <Image className='performer__related-avatar' src={r.avatar} mode='aspectFill' />
                  <Text className='performer__related-name'>{r.name}</Text>
                  <Text className='performer__related-role'>{r.role}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View className='performer__section'>
          <Text className='performer__section-title'>最近演出</Text>
          {shows.length === 0 ? (
            <Text className='performer__empty'>暂无相关演出</Text>
          ) : (
            shows.map(s => (
              <View key={s.id} className='performer__show' onClick={() => goDetail(s.id)}>
                <Image className='performer__show-cover' src={s.cover} mode='aspectFill' />
                <View className='performer__show-info'>
                  <Text className='performer__show-title'>{s.title}</Text>
                  <Text className='performer__show-meta'>{s.date} · {s.city}</Text>
                  <Text className='performer__show-price'>¥{s.priceFrom} 起</Text>
                </View>
                <Icon name='chevron-right' size={32} color='#c0c0c8' />
              </View>
            ))
          )}
        </View>

        <View className='performer__spacer' />
      </ScrollView>
    </ThemeView>
  )
}
