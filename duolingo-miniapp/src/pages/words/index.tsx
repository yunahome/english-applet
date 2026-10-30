import { useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import { COURSE } from '../../data/course'
import { speak } from '../../services/speech'
import { useApp } from '../../store/app-store'
import './index.scss'

export default function Words() {
  const { state } = useApp()

  const groups = useMemo(
    () =>
      COURSE.map((unit) => ({
        unit,
        items: unit.lessons.flatMap((lesson) =>
          lesson.vocab.map((v) => ({
            ...v,
            mastered: !!state.completed[lesson.id],
            lessonTitle: lesson.title
          }))
        )
      })),
    [state.completed]
  )

  const masteredCount = groups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.mastered).length,
    0
  )
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <View className='words'>
      <View className='words-summary'>
        <Text className='words-summary-num'>
          {masteredCount} / {totalCount}
        </Text>
        <Text className='words-summary-label'>已掌握单词（完成对应关卡即点亮）</Text>
      </View>

      {groups.map(({ unit, items }) => (
        <View key={unit.id} className='words-group'>
          <Text className='words-group-title'>{unit.title}</Text>
          {items.map((item) => (
            <View
              key={`${item.en}-${item.lessonTitle}`}
              className={`word-item ${item.mastered ? 'mastered' : ''}`}
              onClick={() => speak(item.en)}
            >
              <View className='word-left'>
                <Text className='word-en'>{item.en}</Text>
                <Text className='word-zh'>{item.zh}</Text>
              </View>
              <Text className='word-badge'>{item.mastered ? '✅ 已掌握' : '🔒 未解锁'}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
