import { useState } from 'react'
import { View, Image, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getFollows } from '../../store'
import { PERFORMERS } from '../../data/performers'
import { Performer } from '../../types'
import Icon from '../../components/Icon'
import ThemeView from '../../components/ThemeView'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

export default function Follows() {
  usePageShare({ title: 'FORENOTE有谱 | 我的关注' })
  const [list, setList] = useState<Performer[]>([])

  useDidShow(() => {
    const ids = getFollows()
    setList(PERFORMERS.filter(p => ids.includes(p.id)))
  })

  const goPerformer = (id: string) => {
    Taro.navigateTo({ url: `/pages/performer/index?id=${id}` })
  }

  return (
    <ThemeView className='follows-page'>
      <ScrollView scrollY className='follows'>
        {list.length === 0 ? (
          <View className='follows__empty'>
            <Text className='follows__empty-icon'>♪</Text>
            <Text className='follows__empty-text'>还没有关注的演奏家</Text>
            <Text className='follows__empty-sub'>去发现喜欢的演奏家吧</Text>
          </View>
        ) : (
          <View className='follows__list'>
            {list.map(p => (
              <View key={p.id} className='follows__item' onClick={() => goPerformer(p.id)}>
                <Image className='follows__avatar' src={p.avatar} mode='aspectFill' />
                <View className='follows__info'>
                  <Text className='follows__name'>{p.name}</Text>
                  <Text className='follows__role'>{p.role}</Text>
                </View>
                <Icon name='chevron-right' size={32} color='#c0c0c8' />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemeView>
  )
}
