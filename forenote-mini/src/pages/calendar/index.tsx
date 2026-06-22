import { useMemo, useState } from 'react'
import { View, Text, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePerformances } from '../../store/performances'
import { dateKey, isPastDateTime, sameDay } from '../../utils/date'
import { colorOf } from '../../utils/color'
import { Performance } from '../../types'
import ThemeView from '../../components/ThemeView'
import { useStatusBar } from '../../hooks/useStatusBar'
import { usePageShare } from '../../hooks/usePageShare'
import './index.scss'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const MAX_BARS = 3
const SPAN_MONTHS = 12

type Cell = { date: Date; inMonth: boolean }
type MonthData = { y: number; m: number; cells: Cell[] }

const buildMonthCells = (year: number, month: number): Cell[] => {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay()
  const cells: Cell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, i + 1 - startOffset)
    cells.push({ date: d, inMonth: d.getMonth() === month })
  }
  return cells
}

const buildMonths = (anchor: Date): MonthData[] => {
  const list: MonthData[] = []
  for (let i = -SPAN_MONTHS; i <= SPAN_MONTHS; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1)
    list.push({ y: d.getFullYear(), m: d.getMonth(), cells: buildMonthCells(d.getFullYear(), d.getMonth()) })
  }
  return list
}

export default function Calendar() {
  usePageShare({ title: 'FORENOTE有谱 | 演出日历' })
  const statusBar = useStatusBar()
  const today = useMemo(() => new Date(), [])
  const months = useMemo(() => buildMonths(today), [today])

  const [monthIdx, setMonthIdx] = useState(SPAN_MONTHS)

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

  const cursor = months[monthIdx]

  const goToday = () => setMonthIdx(SPAN_MONTHS)

  const openDay = (d: Date) =>
    Taro.navigateTo({ url: `/pages/day/index?date=${dateKey(d)}` })

  return (
    <ThemeView className='cal' tabBar>
      <View className='cal__header' style={{ paddingTop: `${statusBar + 12}px` }}>
        <View className='cal__title-row'>
          <Text className='cal__title'>{cursor.y}年 {MONTHS[cursor.m]}</Text>
          <View className='cal__nav-btn' onClick={goToday}>今</View>
        </View>
        <View className='cal__weekdays'>
          {WEEKDAYS.map((w, i) => (
            <Text key={w} className={`cal__weekday ${i === 0 || i === 6 ? 'cal__weekday--weekend' : ''}`}>{w}</Text>
          ))}
        </View>
      </View>

      <View className='cal__body'>
        <Swiper
          className='cal__pages'
          vertical
          current={monthIdx}
          onChange={e => setMonthIdx(e.detail.current)}
          skipHiddenItemLayout
        >
          {months.map((month, mi) => {
            const near = Math.abs(mi - monthIdx) <= 1
            return (
              <SwiperItem key={`${month.y}-${month.m}`} className='cal__page'>
                {near && (
                  <View className='cal__grid'>
                    {Array.from({ length: 6 }).map((_, row) => (
                      <View key={row} className='cal__row'>
                        {month.cells.slice(row * 7, row * 7 + 7).map(cell => {
                          const k = dateKey(cell.date)
                          const events = eventsByDay[k] || []
                          const isToday = sameDay(cell.date, today)
                          const visible = events.slice(0, MAX_BARS)
                          const extra = events.length - visible.length
                          return (
                            <View
                              key={k}
                              className={`cal__cell ${cell.inMonth ? '' : 'cal__cell--out'} ${isToday ? 'cal__cell--today' : ''}`}
                              onClick={() => openDay(cell.date)}
                            >
                              <View className='cal__cell-head'>
                                <Text className='cal__cell-num'>{cell.date.getDate()}</Text>
                              </View>
                              <View className='cal__bars'>
                                {visible.map(ev => {
                                  const c = colorOf(ev.id)
                                  const isPast = isPastDateTime(ev.date, ev.time, today)
                                  return (
                                    <View
                                      key={ev.id}
                                      className={`cal__bar ${isPast ? 'cal__bar--past' : ''}`}
                                      style={isPast ? undefined : { background: c.bg, borderLeftColor: c.bar }}
                                    >
                                      <Text className='cal__bar-text' style={isPast ? undefined : { color: c.fg }}>{ev.title}</Text>
                                    </View>
                                  )
                                })}
                                {extra > 0 && <Text className='cal__more'>+{extra}</Text>}
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    ))}
                  </View>
                )}
              </SwiperItem>
            )
          })}
        </Swiper>
      </View>
    </ThemeView>
  )
}
