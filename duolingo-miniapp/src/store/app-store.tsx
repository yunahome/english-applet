import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Taro from '@tarojs/taro'
import { COURSE } from '../data/course'
import { initCloud, uploadProgress, downloadProgress } from '../services/cloud'

/** 最大红心数，模仿多邻国 */
export const MAX_HEARTS = 5
/** 每 30 分钟恢复 1 颗红心 */
export const HEART_REFILL_INTERVAL = 30 * 60 * 1000
/** 用积分兑换红心：100 积分换满 5 颗 */
export const HEART_EXCHANGE_COST = 100
const STORAGE_KEY = 'duo_app_state_v2'

export interface AppState {
  /** 当前红心数量 */
  hearts: number
  /** 累计经验值 XP */
  xp: number
  /** 连续学习天数 */
  streak: number
  /** 最近一次完成课程学习的日期（YYYY-M-D） */
  lastStudyDate: string
  /** 已完成的关卡 id -> 完成记录（是否满分） */
  completed: Record<string, boolean>
  /** 上次红心自动恢复的时间戳（毫秒），用于跨启动累计恢复 */
  lastHeartRefillAt: number
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function getYesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return formatDate(d)
}

function loadState(): AppState {
  const fallback: AppState = {
    hearts: MAX_HEARTS,
    xp: 0,
    streak: 0,
    lastStudyDate: '',
    completed: {},
    lastHeartRefillAt: Date.now()
  }
  try {
    const saved = Taro.getStorageSync(STORAGE_KEY)
    if (saved && typeof saved === 'object') {
      return { ...fallback, ...(saved as Partial<AppState>) }
    }
  } catch (err) {
    // 存储异常时使用初始值
  }
  return fallback
}

/**
 * 根据距上次恢复的时间，计算应恢复的红心数（跨启动累计）。
 * 返回：{ hearts: 恢复后的红心数, lastRefillAt: 新的基准时间 }
 */
function computeHeartRefill(
  hearts: number,
  lastRefillAt: number,
  now: number
): { hearts: number; lastRefillAt: number } {
  if (hearts >= MAX_HEARTS) {
    return { hearts: MAX_HEARTS, lastRefillAt: now }
  }
  const elapsed = now - lastRefillAt
  if (elapsed < HEART_REFILL_INTERVAL) {
    return { hearts, lastRefillAt }
  }
  const gained = Math.floor(elapsed / HEART_REFILL_INTERVAL)
  const newHearts = Math.min(MAX_HEARTS, hearts + gained)
  const newBase = newHearts >= MAX_HEARTS ? now : lastRefillAt + gained * HEART_REFILL_INTERVAL
  return { hearts: newHearts, lastRefillAt: newBase }
}

export interface AppContextValue {
  state: AppState
  /** 答错一题扣一颗红心；返回扣心后剩余的红心数 */
  loseHeart: () => number
  /** 红心补满（通关奖励 / 兑换） */
  refillHearts: () => void
  /** 完成一关：返回本关获得的 XP */
  completeLesson: (lessonId: string, xpEarned: number) => void
  /** 用 100 积分兑换 5 颗红心；成功返回 true，积分不足返回 false */
  exchangeHearts: () => boolean
  /** 手动触发一次红心按时间恢复计算（页面定时器调用） */
  refreshHearts: () => void
  /** 重置全部进度 */
  resetProgress: () => void
  /** 是否已解锁某关（前一关完成即解锁） */
  isLessonUnlocked: (unitId: string, lessonIndex: number) => boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 状态变化即持久化 + 云端节流同步
  useEffect(() => {
    try {
      Taro.setStorageSync(STORAGE_KEY, state)
    } catch (err) {
      // 忽略持久化错误
    }
    // 节流上传：云同步（若已启用），每 3 秒最多一次
    if (uploadTimer.current === null) {
      uploadTimer.current = setTimeout(() => {
        uploadTimer.current = null
        uploadProgress(state)
      }, 3000)
    }
  }, [state])

  // 冷启动：初始化云环境并从云端拉取进度（云端优先，用于换机恢复）
  useEffect(() => {
    const boot = async () => {
      const ready = initCloud()
      if (!ready) return
      const remote = await downloadProgress()
      if (remote && typeof remote === 'object') {
        const r = remote as Partial<AppState>
        // 仅当云端有关键字段时才覆盖本地
        if ('hearts' in r || 'xp' in r || 'completed' in r) {
          setState((prev) => ({ ...prev, ...r }))
        }
      }
    }
    boot()
  }, [])

  const loseHeart = useCallback((): number => {
    let after = 0
    setState((prev) => {
      const { hearts } = computeHeartRefill(prev.hearts, prev.lastHeartRefillAt, Date.now())
      after = Math.max(0, hearts - 1)
      return {
        ...prev,
        hearts: after,
        lastHeartRefillAt: Date.now()
      }
    })
    return after
  }, [])

  const refillHearts = useCallback(() => {
    setState((prev) => ({ ...prev, hearts: MAX_HEARTS, lastHeartRefillAt: Date.now() }))
  }, [])

  const completeLesson = useCallback((lessonId: string, xpEarned: number) => {
    setState((prev) => {
      const todayStr = formatDate(new Date())
      let streak = prev.streak
      if (prev.lastStudyDate !== todayStr) {
        // 今天第一次学习：昨天学过则连续 +1，否则重新从 1 开始
        streak = prev.lastStudyDate === getYesterday() ? prev.streak + 1 : 1
      }
      return {
        ...prev,
        xp: prev.xp + xpEarned,
        streak,
        lastStudyDate: todayStr,
        // 通关后红心恢复满（规则：闯关完成且未耗尽 → 恢复 5 颗）
        hearts: MAX_HEARTS,
        lastHeartRefillAt: Date.now(),
        completed: { ...prev.completed, [lessonId]: true }
      }
    })
  }, [])

  const exchangeHearts = useCallback((): boolean => {
    let ok = false
    setState((prev) => {
      if (prev.xp < HEART_EXCHANGE_COST) return prev
      ok = true
      return {
        ...prev,
        xp: prev.xp - HEART_EXCHANGE_COST,
        hearts: MAX_HEARTS,
        lastHeartRefillAt: Date.now()
      }
    })
    return ok
  }, [])

  const refreshHearts = useCallback(() => {
    setState((prev) => {
      const { hearts, lastRefillAt } = computeHeartRefill(
        prev.hearts,
        prev.lastHeartRefillAt,
        Date.now()
      )
      if (hearts === prev.hearts && lastRefillAt === prev.lastHeartRefillAt) return prev
      return { ...prev, hearts, lastHeartRefillAt: lastRefillAt }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setState({
      hearts: MAX_HEARTS,
      xp: 0,
      streak: 0,
      lastStudyDate: '',
      completed: {},
      lastHeartRefillAt: Date.now()
    })
  }, [])

  const isLessonUnlocked = useCallback(
    (unitId: string, lessonIndex: number) => {
      if (lessonIndex === 0) return true
      const unit = COURSE.find((u) => u.id === unitId)
      if (!unit) return false
      const prevLesson = unit.lessons[lessonIndex - 1]
      return !!state.completed[prevLesson.id]
    },
    [state.completed]
  )

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      loseHeart,
      refillHearts,
      completeLesson,
      exchangeHearts,
      refreshHearts,
      resetProgress,
      isLessonUnlocked
    }),
    [
      state,
      loseHeart,
      refillHearts,
      completeLesson,
      exchangeHearts,
      refreshHearts,
      resetProgress,
      isLessonUnlocked
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp 必须在 AppProvider 内使用')
  }
  return ctx
}
