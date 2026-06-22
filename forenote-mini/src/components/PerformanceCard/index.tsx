import { View, Image, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Performance } from '../../types'
import './card.scss'

interface Props {
  data: Performance
}

export default function PerformanceCard({ data }: Props) {
  const goDetail = () => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${data.id}` })
  }

  return (
    <View className='perf-card' onClick={goDetail}>
      <Image className='perf-card__cover' src={data.cover} mode='aspectFill' />
      <View className='perf-card__body'>
        <Text className='perf-card__title'>{data.title}</Text>
        <Text className='perf-card__meta'>{data.city} · {data.venue}</Text>
        <View className='perf-card__bottom'>
          <Text className='perf-card__date'>{data.date} {data.time}</Text>
          <Text className='perf-card__price'>¥{data.priceFrom} 起</Text>
        </View>
      </View>
    </View>
  )
}
