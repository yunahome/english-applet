import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { COURSE } from '../../data/course'
import { useApp, MAX_HEARTS } from '../../store/app-store'
import './index.scss'

export default function Profile() {
  const { state, resetProgress } = useApp()

  const level = useMemo(() => Math.floor(state.xp / 100) + 1, [state.xp])
  const levelProgress = useMemo(() => (state.xp % 100), [state.xp])
  const doneCount = useMemo(() => Object.keys(state.completed).length, [state.completed])
  const totalCount = useMemo(
    () => COURSE.reduce((sum, u) => sum + u.lessons.length, 0),
    []
  )

  const onReset = () => {
    Taro.showModal({
      title: '重置进度',
      content: '将清空红心、XP、打卡与全部闯关记录，确定继续吗？',
      confirmColor: '#FF4B4B',
      success: (res) => {
        if (res.confirm) {
          resetProgress()
          Taro.showToast({ title: '已重置', icon: 'success' })
        }
      }
    })
  }

  return (
    <View className='profile'>
      <View className='card head-card'>
        <View className='avatar'>🦉</View>
        <Text className='nickname'>Duo 学习者</Text>
        <Text className='level-tag'>Lv.{level} 英语新手</Text>
        <View className='level-bar'>
          <View className='level-bar-fill' style={{ width: `${levelProgress}%` }} />
        </View>
        <Text className='level-tip'>距离下一级还差 {100 - levelProgress} XP</Text>
      </View>

      <View className='grid'>
        <View className='grid-item'>
          <Text className='grid-num streak'>🔥 {state.streak}</Text>
          <Text className='grid-label'>连续打卡（天）</Text>
        </View>
        <View className='grid-item'>
          <Text className='grid-num xp'>⚡ {state.xp}</Text>
          <Text className='grid-label'>累计经验 XP</Text>
        </View>
        <View className='grid-item'>
          <Text className='grid-num heart'>❤️ {state.hearts}/{MAX_HEARTS}</Text>
          <Text className='grid-label'>当前红心</Text>
        </View>
        <View className='grid-item'>
          <Text className='grid-num done'>📖 {doneCount}/{totalCount}</Text>
          <Text className='grid-label'>完成关卡</Text>
        </View>
      </View>

      <View className='btn danger' onClick={onReset}>
        <Text className='btn-text'>重置全部进度</Text>
      </View>

      <View className='about'>
        <Text>Duo英语 · 模仿多邻国的英语闯关小程序</Text>
        <Text>基于 Taro 4 + React + TypeScript + Vite</Text>
      </View>
    </View>
  )
}
