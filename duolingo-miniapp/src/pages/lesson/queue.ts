/**
 * 闯关答题队列的状态机（纯函数，便于单元测试）
 *
 * 规则（模仿多邻国错题重练）：
 * - 正常按顺序答题
 * - 答错的题进入重练队列（去重）
 * - 本关所有题目过完后，若有错题，把错题再问一遍（期间再答错则再次入队，直到全部答对）
 * - 队列与重练队列都为空 → 本关完成
 */

export interface QueueState {
  /** 待答题目下标队列 */
  queue: number[]
  /** 答错待重练的题目下标 */
  requeue: number[]
  /** 本次推进是否进入了错题重练阶段 */
  enteringRepractice: boolean
  /** 本次推进后是否整关完成 */
  finished: boolean
}

/** 答完当前题后推进队列 */
export function advance(queue: number[], requeue: number[]): QueueState {
  const rest = queue.slice(1)
  if (rest.length === 0 && requeue.length > 0) {
    return { queue: [...requeue], requeue: [], enteringRepractice: true, finished: false }
  }
  if (rest.length === 0 && requeue.length === 0) {
    return { queue: [], requeue: [], enteringRepractice: false, finished: true }
  }
  return { queue: rest, requeue, enteringRepractice: false, finished: false }
}

/** 答错时把题目下标加入重练队列（去重） */
export function enqueueWrong(requeue: number[], idx: number): number[] {
  return requeue.includes(idx) ? requeue : [...requeue, idx]
}
