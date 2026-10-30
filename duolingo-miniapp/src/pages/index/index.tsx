import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { COURSE, LESSONS_PER_UNIT } from '../../data/course'
import { useApp, MAX_HEARTS } from '../../store/app-store'
import './index.scss'

export default function Index() {
  const { state, isLessonUnlocked } = useApp()

  const level = useMemo(() => Math.floor(state.xp / 100) + 1, [state.xp])

  /** 单元解锁：第 1 单元默认解锁，后续单元需前一单元全部关卡完成 */
  const isUnitUnlocked = (unitIndex: number): boolean => {
    if (unitIndex === 0) return true
    const prev = COURSE[unitIndex - 1]
    return prev.lessons.every((l) => state.completed[l.id])
  }

  const unitProgress = (unitIndex: number): number =>
    COURSE[unitIndex].lessons.filter((l) => state.completed[l.id]).length

  const goLesson = (unitId: string, lessonId: string, hasQuestions: boolean) => {
    if (!hasQuestions) {
      Taro.showToast({ title: '该单元内容筹备中', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/pages/lesson/index?unitId=${unitId}&lessonId=${lessonId}` })
  }

  return (
    <View className='home'>
      {/* 顶部状态栏 */}
      <View className='stats'>
        <View className='stat'>
          <Text className='stat-icon'>🔥</Text>
          <Text className='stat-value stat-streak'>{state.streak}</Text>
        </View>
        <View className='stat'>
          <Text className='stat-icon'>❤️</Text>
          <Text className='stat-value stat-heart'>{state.hearts}</Text>
        </View>
        <View className='stat'>
          <Text className='stat-icon'>⚡</Text>
          <Text className='stat-value stat-xp'>{state.xp}</Text>
        </View>
        <View className='stat'>
          <Text className='stat-icon'>🏆</Text>
          <Text className='stat-value stat-level'>Lv.{level}</Text>
        </View>
      </View>

      <View className='banner'>
        <Text className='banner-title'>英语闯关</Text>
        <Text className='banner-sub'>
          8 大单元 · 每单元 {LESSONS_PER_UNIT} 关 · 逐关解锁
        </Text>
      </View>

      {COURSE.map((unit, unitIndex) => {
        const unlocked = isUnitUnlocked(unitIndex)
        const done = unitProgress(unitIndex)

        // 锁定单元：只显示卡片
        if (!unlocked) {
          return (
            <View key={unit.id} className='unit-card locked-card'>
              <View className='locked-left'>
                <Text className='locked-icon'>🔒</Text>
                <View className='locked-info'>
                  <Text className='locked-title'>{unit.title}</Text>
                  <Text className='locked-sub'>
                    完成「{COURSE[unitIndex - 1].title}」全部关卡后解锁
                  </Text>
                </View>
              </View>
              <Text className='locked-count'>
                {done}/{LESSONS_PER_UNIT}
              </Text>
            </View>
          )
        }

        // 进行中/已完成单元：展示全部关卡（网格）
        return (
          <View key={unit.id} className='unit' style={{ background: unit.color }}>
            <View className='unit-header'>
              <Text className='unit-title'>{unit.title}</Text>
              <Text className='unit-progress'>
                {done}/{LESSONS_PER_UNIT}
              </Text>
            </View>
            <View className='lesson-grid'>
              {unit.lessons.map((lesson, idx) => {
                const lessonUnlocked = isLessonUnlocked(unit.id, idx)
                const lessonDone = !!state.completed[lesson.id]
                const hasQuestions = lesson.questions.length > 0
                return (
                  <View
                    key={lesson.id}
                    className={`lesson-node ${lessonUnlocked ? '' : 'locked'} ${lessonDone ? 'done' : ''}`}
                    onClick={
                      lessonUnlocked
                        ? () => goLesson(unit.id, lesson.id, hasQuestions)
                        : undefined
                    }
                  >
                    <Text className='lesson-node-icon'>
                      {lessonDone ? '⭐' : lessonUnlocked ? (hasQuestions ? idx + 1 : '·') : '🔒'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )
      })}

      <View className='footer-tip'>
        <Text>集齐 {MAX_HEARTS} 颗红心闯关，答错扣一颗，错题将在关末重练 ⚡</Text>
      </View>
    </View>
  )
}
