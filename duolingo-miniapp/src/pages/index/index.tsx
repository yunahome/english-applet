import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { COURSE, LESSONS_PER_UNIT } from '../../data/course'
import { useApp, MAX_HEARTS } from '../../store/app-store'
import './index.scss'

// 图片统一放在 src/assets/home，构建时由 copy 插件复制到 /assets/home
const ASSET = '/assets/home'

// 关卡插图（6 张循环使用）
const LESSON_IMGS = [
  `${ASSET}/lesson-plane.jpg`,
  `${ASSET}/lesson-house.jpg`,
  `${ASSET}/lesson-school.jpg`,
  `${ASSET}/lesson-book.jpg`,
  `${ASSET}/lesson-food.jpg`,
  `${ASSET}/lesson-cat.jpg`
]

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

  const goProfile = () => Taro.switchTab({ url: '/pages/profile/index' })

  return (
    <View className='home'>
      {/* 全屏卡通背景 */}
      <Image className='home-bg' src={`${ASSET}/bg.jpg`} mode='aspectFill' />

      <View className='home-content'>
        {/* 顶部：吉祥物 + 气泡 + 连击/设置 */}
        <View className='top-bar'>
          <Image className='mascot' src={`${ASSET}/mascot.png`} mode='aspectFit' />
          <View className='bubble'>
            <Text className='bubble-title'>Hello!</Text>
            <View className='bubble-sub'>
              <Text className='bubble-sub-text'>Let's keep learning!</Text>
              <Text className='bubble-arrow'>›</Text>
            </View>
          </View>
          <View className='top-right'>
            <View className='streak-pill'>
              <Text className='streak-flame'>🔥</Text>
              <Text className='streak-num'>{state.streak}</Text>
            </View>
            <View className='gear-btn' onClick={goProfile}>
              <Text className='gear-icon'>⚙️</Text>
            </View>
          </View>
        </View>

        {/* 今日目标卡片 */}
        <View className='goal-card'>
          <View className='goal-ring-wrap'>
            <View className='goal-ring'>
              <View className='goal-ring-inner'>
                <Text className='goal-flame'>🔥</Text>
                <Text className='goal-streak-num'>{state.streak}</Text>
                <Text className='goal-streak-label'>day streak</Text>
              </View>
            </View>
          </View>
          <View className='goal-right'>
            <Text className='goal-label'>Today's Goal</Text>
            <Text className='goal-value'>20 min</Text>
            <View className='goal-bar'>
              <View
                className='goal-bar-fill'
                style={{ width: `${Math.min(100, state.xp % 100)}%` }}
              />
            </View>
          </View>
          <Text className='goal-calendar'>📅</Text>
        </View>

        {COURSE.map((unit, unitIndex) => {
          const unlocked = isUnitUnlocked(unitIndex)
          const done = unitProgress(unitIndex)

          // 锁定单元：半透明锁定卡
          if (!unlocked) {
            return (
              <View key={unit.id} className='unit-block locked'>
                <View className='ribbon locked-ribbon'>
                  <Image className='ribbon-bg' src={`${ASSET}/ribbon.png`} mode='scaleToFill' />
                  <Text className='ribbon-title'>{unit.title}</Text>
                </View>
                <View className='locked-tip-card'>
                  <Text className='locked-tip-icon'>🔒</Text>
                  <Text className='locked-tip-text'>
                    完成「{COURSE[unitIndex - 1].title}」全部关卡后解锁
                  </Text>
                </View>
              </View>
            )
          }

          // 已解锁单元：缎带 + 之字形关卡路径
          return (
            <View key={unit.id} className='unit-block'>
              <View className='unit-head'>
                <View className='ribbon'>
                  <Image className='ribbon-bg' src={`${ASSET}/ribbon.png`} mode='scaleToFill' />
                  <Text className='ribbon-title'>{unit.title}</Text>
                </View>
                <Text className='unit-count'>
                  {done}/{LESSONS_PER_UNIT} ›
                </Text>
              </View>

              {/* 之字形关卡路径（弯曲虚线连接） */}
              <View className='path'>
                {unit.lessons.map((lesson, idx) => {
                  const lessonUnlocked = isLessonUnlocked(unit.id, idx)
                  const lessonDone = !!state.completed[lesson.id]
                  const hasQuestions = lesson.questions.length > 0
                  const img = LESSON_IMGS[idx % LESSON_IMGS.length]
                  const side = idx % 2 === 0 ? 'left' : 'right'
                  // 当前节点的连接线方向：left 节点之后向右弯，right 节点之后向左弯
                  const connector = side === 'left' ? 'c-lr' : 'c-rl'
                  return (
                    <View key={lesson.id}>
                      <View
                        className={`path-node ${side} ${lessonUnlocked ? '' : 'locked'} ${
                          lessonDone ? 'done' : ''
                        }`}
                        onClick={
                          lessonUnlocked
                            ? () => goLesson(unit.id, lesson.id, hasQuestions)
                            : undefined
                        }
                      >
                        <View className='node-card'>
                          <Image className='node-img' src={img} mode='aspectFill' />
                          <View className='node-meta'>
                            <Text className='node-star'>⭐</Text>
                            <Text className='node-count'>
                              {lessonDone ? 3 : 0}/3
                            </Text>
                          </View>
                        </View>
                        {/* 角标：已完成 ✓ / 未解锁 🔒 */}
                        {lessonDone && (
                          <View className='node-badge done-badge'>
                            <Text className='badge-check'>✓</Text>
                          </View>
                        )}
                        {!lessonUnlocked && (
                          <View className='node-badge lock-badge'>
                            <Text className='badge-lock'>🔒</Text>
                          </View>
                        )}
                      </View>
                      {/* 节点之间的弯曲虚线 */}
                      {idx < unit.lessons.length - 1 && (
                        <View className={`path-connector ${connector}`} />
                      )}
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
    </View>
  )
}
