import { useEffect, useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { findLesson, type Question } from '../../data/course'
import { advance, enqueueWrong } from './queue'
import { speak } from '../../services/speech'
import { useApp, HEART_EXCHANGE_COST } from '../../store/app-store'
import './index.scss'

type Phase = 'answer' | 'correct' | 'wrong' | 'done' | 'outOfHearts' | 'failed'

const BASE_XP = 10
const PERFECT_BONUS_XP = 5

export default function Lesson() {
  const router = useRouter()
  const { unitId = '', lessonId = '' } = router.params
  const { state, loseHeart, completeLesson, exchangeHearts, refreshHearts } = useApp()

  const found = useMemo(() => findLesson(unitId, lessonId), [unitId, lessonId])

  // 答题队列（题目下标）。注意：整关完成时 queue 会变为空数组，
  // 此时必须仍然渲染结算弹窗，不能提前 return！
  const [queue, setQueue] = useState<number[]>(() =>
    found ? found.lesson.questions.map((_, i) => i) : []
  )
  const [requeue, setRequeue] = useState<number[]>([])
  const [answered, setAnswered] = useState(0)
  const [extraCount, setExtraCount] = useState(0) // 错题重练带来的额外题数（进度条分母）
  const [repractice, setRepractice] = useState(false) // 是否处于错题重练阶段
  const [phase, setPhase] = useState<Phase>(state.hearts <= 0 ? 'outOfHearts' : 'answer')
  const [selected, setSelected] = useState<string>('') // 选择题已选选项
  const [picked, setPicked] = useState<number[]>([]) // 组句题已选的单词下标
  const [mistakes, setMistakes] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [lastWrongAnswer, setLastWrongAnswer] = useState('')

  // 每 30 秒检查一次红心按时间恢复（30 分钟恢复 1 颗）
  useEffect(() => {
    refreshHearts()
    const timer = setInterval(refreshHearts, 30 * 1000)
    return () => clearInterval(timer)
  }, [refreshHearts])

  // 红心耗尽状态下，若红心恢复上来（>0），关闭耗尽弹窗回到答题
  useEffect(() => {
    if (phase === 'outOfHearts' && state.hearts > 0) {
      setPhase('answer')
      setSelected('')
      setPicked([])
      setLastWrongAnswer('')
    }
  }, [phase, state.hearts])

  if (!found) {
    return (
      <View className='lesson'>
        <View className='lesson-missing'>关卡数据不存在</View>
      </View>
    )
  }

  const { lesson } = found
  // 队列为空时（整关完成）question 为 null，此时只渲染结算/失败弹窗
  const question: Question | null = queue.length > 0 ? lesson.questions[queue[0]] : null
  const progress = Math.min(
    100,
    Math.round((answered / (lesson.questions.length + extraCount)) * 100)
  )

  const restart = () => {
    // 重新闯关：不清空/不恢复红心（由外部红心状态决定能否开始）
    setQueue(lesson.questions.map((_, i) => i))
    setRequeue([])
    setAnswered(0)
    setExtraCount(0)
    setRepractice(false)
    setMistakes(0)
    setXpEarned(0)
    setLastWrongAnswer('')
    setPhase('answer')
  }

  const backToMap = () => Taro.navigateBack()

  // 答错：红心 -1，题目进入重练队列
  const handleWrong = () => {
    setLastWrongAnswer(
      question!.type === 'choice'
        ? (question! as Extract<Question, { type: 'choice' }>).answer
        : (question! as Extract<Question, { type: 'translate' }>).answer.join(' ')
    )
    setRequeue((r) => enqueueWrong(r, queue[0]))
    setExtraCount((e) => (requeue.includes(queue[0]) ? e : e + 1))
    setMistakes((m) => m + 1)
    const remaining = loseHeart()
    if (remaining <= 0) {
      setPhase('outOfHearts')
    } else {
      setPhase('wrong')
    }
  }

  // 红心耗尽后：选择用积分兑换，还是放弃（闯关失败）
  const onExchange = () => {
    const ok = exchangeHearts()
    if (!ok) {
      Taro.showToast({ title: '积分不足 100，无法兑换', icon: 'none' })
      return
    }
    // 兑换成功：红心补满，继续答题（题目仍在重练队列，从当前题继续）
    setPhase('answer')
    setSelected('')
    setPicked([])
    setLastWrongAnswer('')
  }

  const onGiveUp = () => {
    // 闯关失败：不恢复红心，返回地图，本关需重新闯关
    setPhase('failed')
  }

  const checkChoice = () => {
    const q = question as Extract<Question, { type: 'choice' }>
    if (selected === q.answer) {
      setPhase('correct')
    } else {
      handleWrong()
    }
  }

  const checkTranslate = () => {
    const q = question as Extract<Question, { type: 'translate' }>
    const built = picked.map((i) => q.bank[i]).join(' ')
    const answer = q.answer.join(' ')
    if (built === answer) {
      setPhase('correct')
    } else {
      handleWrong()
    }
  }

  const onCheck = () => {
    if (phase !== 'answer' || !question) return
    if (question.type === 'choice') checkChoice()
    else checkTranslate()
  }

  const onContinue = () => {
    const next = advance(queue, requeue)
    setQueue(next.queue)
    setRequeue(next.requeue)
    setRepractice(next.enteringRepractice || repractice)
    setAnswered((a) => a + 1)

    if (next.finished) {
      // 全部（含重练）答对，结算
      const earned = BASE_XP + (mistakes === 0 ? PERFECT_BONUS_XP : 0)
      completeLesson(lesson.id, earned)
      setXpEarned(earned)
      setPhase('done')
    } else {
      setSelected('')
      setPicked([])
      setLastWrongAnswer('')
      setPhase('answer')
    }
  }

  const canCheck =
    phase === 'answer' &&
    !!question &&
    (question.type === 'choice' ? selected !== '' : picked.length > 0)

  const renderChoice = (q: Extract<Question, { type: 'choice' }>) => (
    <View className='options'>
      {q.options.map((opt) => (
        <View
          key={opt}
          className={`option ${selected === opt ? 'active' : ''} ${
            phase === 'wrong' && opt === q.answer ? 'right' : ''
          }`}
          onClick={() => {
            if (phase !== 'answer') return
            speak(opt) // 点击英文选项即发音
            setSelected(opt)
          }}
        >
          <Text>{opt}</Text>
        </View>
      ))}
    </View>
  )

  const renderTranslate = (q: Extract<Question, { type: 'translate' }>) => {
    const answerWords = picked.map((i) => ({ word: q.bank[i], idx: i }))
    return (
      <View className='translate'>
        <View className='answer-zone'>
          {answerWords.length === 0 ? (
            <Text className='answer-zone-tip'>点击下方单词组句</Text>
          ) : (
            answerWords.map(({ word, idx }) => (
              <View
                key={`${word}-${idx}`}
                className='word'
                onClick={() => {
                  speak(word) // 点击已选单词发音
                  setPicked((p) => p.filter((x) => x !== idx))
                }}
              >
                <Text>{word}</Text>
              </View>
            ))
          )}
        </View>
        <View className='divider' />
        <View className='bank'>
          {q.bank.map((word, idx) => {
            const used = picked.includes(idx)
            return (
              <View
                key={`${word}-${idx}`}
                className={`word ${used ? 'used' : ''}`}
                onClick={() => {
                  if (phase !== 'answer' || used) return
                  speak(word) // 点击单词库发音
                  setPicked((p) => [...p, idx])
                }}
              >
                <Text>{word}</Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View className='lesson'>
      {/* 顶部：退出 + 进度条 + 红心 */}
      <View className='lesson-header'>
        <Text className='lesson-close' onClick={backToMap}>
          ✕
        </Text>
        <View className='progress-track'>
          <View className='progress-fill' style={{ width: `${progress}%` }} />
        </View>
        <Text className='lesson-hearts'>❤️ {state.hearts}</Text>
      </View>

      {repractice && phase !== 'done' && phase !== 'failed' && (
        <View className='repractice-banner'>
          <Text className='repractice-text'>🔁 错题重练 · 把刚才答错的题再答一遍</Text>
        </View>
      )}

      <View className='lesson-body'>
        {question && (
          <>
            <Text className='lesson-question'>{question.question}</Text>
            {question.type === 'choice'
              ? renderChoice(question as Extract<Question, { type: 'choice' }>)
              : renderTranslate(question as Extract<Question, { type: 'translate' }>)}
          </>
        )}
      </View>

      {/* 底部按钮 / 答题反馈 */}
      <View
        className={`lesson-footer ${phase === 'correct' ? 'footer-correct' : ''} ${
          phase === 'wrong' ? 'footer-wrong' : ''
        }`}
      >
        {phase === 'answer' && question && (
          <View
            className={`check-btn ${canCheck ? '' : 'disabled'}`}
            onClick={canCheck ? onCheck : undefined}
          >
            <Text className='check-btn-text'>检查</Text>
          </View>
        )}
        {phase === 'correct' && (
          <View className='feedback'>
            <View className='feedback-text correct'>
              <Text className='feedback-title'>太棒了！🎉</Text>
            </View>
            <View className='feedback-btn' onClick={onContinue}>
              <Text className='feedback-btn-text'>继续</Text>
            </View>
          </View>
        )}
        {phase === 'wrong' && (
          <View className='feedback'>
            <View className='feedback-text wrong'>
              <Text className='feedback-title'>再想想～</Text>
              <Text className='feedback-answer'>正确答案：{lastWrongAnswer}</Text>
            </View>
            <View className='feedback-btn' onClick={onContinue}>
              <Text className='feedback-btn-text'>继续</Text>
            </View>
          </View>
        )}
      </View>

      {/* 结算弹窗 */}
      {phase === 'done' && (
        <View className='overlay'>
          <View className='result-card'>
            <Text className='result-emoji'>{mistakes === 0 ? '🌟' : '🎉'}</Text>
            <Text className='result-title'>{mistakes === 0 ? '完美通关！' : '完成关卡！'}</Text>
            <Text className='result-xp'>+{xpEarned} XP</Text>
            <Text className='result-sub'>
              {mistakes === 0
                ? '全对通关，获得额外 XP 奖励'
                : `本次答错 ${mistakes} 题，错题已重练通过`}
            </Text>
            <View className='result-btn' onClick={backToMap}>
              <Text className='result-btn-text'>返回地图</Text>
            </View>
          </View>
        </View>
      )}

      {/* 红心耗尽弹窗：用积分兑换 or 放弃 */}
      {phase === 'outOfHearts' && (
        <View className='overlay'>
          <View className='result-card'>
            <Text className='result-emoji'>💔</Text>
            <Text className='result-title'>红心已耗尽</Text>
            <Text className='result-sub'>
              当前拥有 {state.xp} 积分，可用 {HEART_EXCHANGE_COST} 积分兑换 5 颗红心
            </Text>
            <View className='result-btn' onClick={onExchange}>
              <Text className='result-btn-text'>用 {HEART_EXCHANGE_COST} 积分兑换红心</Text>
            </View>
            <View className='result-btn ghost' onClick={onGiveUp}>
              <Text className='result-btn-text ghost'>放弃（闯关失败）</Text>
            </View>
          </View>
        </View>
      )}

      {/* 闯关失败弹窗 */}
      {phase === 'failed' && (
        <View className='overlay'>
          <View className='result-card'>
            <Text className='result-emoji'>😢</Text>
            <Text className='result-title'>闯关失败</Text>
            <Text className='result-sub'>
              红心已耗尽，本关未完成。红心将随时间恢复（每 30 分钟 +1），恢复后重新闯关即可。
            </Text>
            <View className='result-btn ghost' onClick={backToMap}>
              <Text className='result-btn-text ghost'>返回地图</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
