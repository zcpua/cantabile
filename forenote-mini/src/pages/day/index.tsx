import { useMemo, useState } from 'react'
import { View, Text, Swiper, SwiperItem, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { usePerformances } from '../../store/performances'
import { addDays, dateKey, parseDateKey, sameDay, startOfWeek } from '../../utils/date'
import { colorOf } from '../../utils/color'
import { Performance } from '../../types'
import Icon from '../../components/Icon'
import ThemeView from '../../components/ThemeView'
import { useStatusBar } from '../../hooks/useStatusBar'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_SPAN = 12
const WEEK_LEN = WEEK_SPAN * 2 + 1
// 日范围要略大于周范围（±12 周再加一周缓冲），覆盖 startOfWeek 带来的偏移，
// 否则滑到最边缘的周时选中日期会越界、无法跟随。
const DAY_SPAN = WEEK_SPAN * 7 + 7
const DAY_LEN = DAY_SPAN * 2 + 1
const DAY_MS = 24 * 60 * 60 * 1000

export default function Day() {
  usePageShare({ title: 'FORENOTE有谱 | 每日演出' })
  const statusBar = useStatusBar()
  const router = useRouter()
  const today = useMemo(() => new Date(), [])
  const anchor = useMemo(() => parseDateKey(router.params.date), [router.params.date])

  const { list } = usePerformances()

  const eventsByDay = useMemo(() => {
    const map: Record<string, Performance[]> = {}
    list.forEach(p => {
      if (!map[p.date]) map[p.date] = []
      map[p.date].push(p)
    })
    Object.values(map).forEach(l => l.sort((a, b) => a.time.localeCompare(b.time)))
    return map
  }, [list])

  const allDays = useMemo(
    () => Array.from({ length: DAY_LEN }, (_, i) => addDays(anchor, i - DAY_SPAN)),
    [anchor]
  )
  const weekAnchorStart = useMemo(() => startOfWeek(anchor), [anchor])
  const allWeeks = useMemo(
    () => Array.from({ length: WEEK_LEN }, (_, i) => {
      const start = addDays(weekAnchorStart, (i - WEEK_SPAN) * 7)
      return Array.from({ length: 7 }, (__, k) => addDays(start, k))
    }),
    [weekAnchorStart]
  )

  const [dayIdx, setDayIdx] = useState(DAY_SPAN)
  const [weekIdx, setWeekIdx] = useState(WEEK_SPAN)

  const activeDate = allDays[dayIdx] || anchor

  const dayIdxOf = (d: Date) =>
    DAY_SPAN + Math.round((d.getTime() - anchor.getTime()) / DAY_MS)
  const weekIdxOf = (d: Date) =>
    WEEK_SPAN + Math.round((startOfWeek(d).getTime() - weekAnchorStart.getTime()) / (7 * DAY_MS))

  const onDayChange = (e: { detail: { current: number; source?: string } }) => {
    if (e.detail.source === '') return
    const next = e.detail.current
    setDayIdx(next)
    const w = weekIdxOf(allDays[next])
    if (w >= 0 && w < WEEK_LEN && w !== weekIdx) setWeekIdx(w)
  }

  const onWeekChange = (e: { detail: { current: number; source?: string } }) => {
    if (e.detail.source === '') return
    const next = e.detail.current
    setWeekIdx(next)
    // 切到新周后，保持原来选中的星期几，并让日视图跟随到那一天。
    const wd = activeDate.getDay()
    const ni = dayIdxOf(allWeeks[next][wd])
    if (ni >= 0 && ni < DAY_LEN) setDayIdx(ni)
  }

  const tapWeekCell = (d: Date) => {
    const ni = dayIdxOf(d)
    if (ni >= 0 && ni < DAY_LEN) setDayIdx(ni)
  }

  const goToday = () => {
    const di = dayIdxOf(today)
    const wi = weekIdxOf(today)
    if (di >= 0 && di < DAY_LEN) setDayIdx(di)
    if (wi >= 0 && wi < WEEK_LEN) setWeekIdx(wi)
  }

  const goBack = () => Taro.navigateBack()
  const goDetail = (id: string) => Taro.navigateTo({ url: `/pages/detail/index?id=${id}` })

  return (
    <ThemeView className='day'>
      <View className='day__header' style={{ paddingTop: `${statusBar + 12}px` }}>
        <View className='day__titlebar'>
          <View className='day__back' onClick={goBack}>
            <Icon name='chevron-left' size={40} color='#c9a96a' />
            <Text className='day__back-text'>{activeDate.getMonth() + 1}月</Text>
          </View>
          <View className='day__nav-btn' onClick={goToday}>今</View>
        </View>
        <View className='day__weekdays'>
          {WEEKDAYS.map((w, i) => (
            <Text key={w} className={`day__weekday ${i === 0 || i === 6 ? 'day__weekday--weekend' : ''}`}>{w}</Text>
          ))}
        </View>
        <Swiper className='day__weekstrip' current={weekIdx} onChange={onWeekChange} skipHiddenItemLayout>
          {allWeeks.map((week, i) => (
            <SwiperItem key={i} className='day__weekitem'>
              {Math.abs(i - weekIdx) <= 1 && (
                <View className='day__weekrow'>
                  {week.map(d => {
                    const isActive = sameDay(d, activeDate)
                    const isToday = sameDay(d, today)
                    const has = (eventsByDay[dateKey(d)] || []).length > 0
                    return (
                      <View
                        key={d.getTime()}
                        className={`day__wcell ${isActive ? 'day__wcell--active' : ''} ${!isActive && isToday ? 'day__wcell--today' : ''}`}
                        onClick={() => tapWeekCell(d)}
                      >
                        <Text className='day__wcell-num'>{d.getDate()}</Text>
                        {has && <View className='day__wcell-dot' />}
                      </View>
                    )
                  })}
                </View>
              )}
            </SwiperItem>
          ))}
        </Swiper>
        <View className='day__dateline'>
          <Text className='day__dateline-main'>
            {activeDate.getFullYear()}年{activeDate.getMonth() + 1}月{activeDate.getDate()}日
          </Text>
          <Text className='day__dateline-week'>星期{WEEKDAYS[activeDate.getDay()]}</Text>
        </View>
      </View>

      <Swiper className='day__days' current={dayIdx} onChange={onDayChange} skipHiddenItemLayout>
        {allDays.map((d, i) => {
          if (Math.abs(i - dayIdx) > 1) return <SwiperItem key={i} className='day__dayitem' />
          const events = eventsByDay[dateKey(d)] || []
          return (
            <SwiperItem key={i} className='day__dayitem'>
              <ScrollView scrollY className='day__dayscroll'>
                {events.length === 0 ? (
                  <View className='day__empty'>
                    <Icon name='music' size={96} color='#d8d8de' />
                    <Text className='day__empty-text'>这一天还很安静</Text>
                    <Text className='day__empty-hint'>左右滑动查看其它日期</Text>
                  </View>
                ) : (
                  <View className='day__list'>
                    {events.map(ev => {
                      const c = colorOf(ev.id)
                      return (
                        <View key={ev.id} className='day__event' onClick={() => goDetail(ev.id)}>
                          <View className='day__time'>
                            <Text className='day__time-start'>{ev.time}</Text>
                          </View>
                          <View className='day__card' style={{ background: c.bg, borderLeftColor: c.bar }}>
                            <Image className='day__card-cover' src={ev.cover} mode='aspectFill' />
                            <View className='day__card-body'>
                              <Text className='day__card-title' style={{ color: c.fg }}>{ev.title}</Text>
                              <Text className='day__card-meta'>{ev.city} · {ev.venue}</Text>
                              <Text className='day__card-meta'>{ev.performers.map(p => p.name).slice(0, 2).join(' · ')}</Text>
                            </View>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}
              </ScrollView>
            </SwiperItem>
          )
        })}
      </Swiper>
    </ThemeView>
  )
}
