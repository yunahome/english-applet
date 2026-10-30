// 错题重练队列状态机测试（用 esbuild 转译 queue.ts 后运行）
const assert = require('assert')
const { advance, enqueueWrong } = require('/tmp/duo-queue.cjs')

let passed = 0
function check(name, fn) {
  fn()
  passed++
  console.log('  ✓', name)
}

// 场景 A：4 题，第 2 题（下标 1）答错一次，其余全对
check('A1: 前两题正常推进', () => {
  let s = advance([0, 1, 2, 3], [])
  assert.deepStrictEqual(s, { queue: [1, 2, 3], requeue: [], enteringRepractice: false, finished: false })
  s = advance(s.queue, s.requeue)
  assert.deepStrictEqual(s.queue, [2, 3])
})
check('A2: 第 3 题答错进入重练队列，推进到下一题', () => {
  let requeue = enqueueWrong([], 1)
  assert.deepStrictEqual(requeue, [1])
  const s = advance([2, 3], requeue)
  assert.deepStrictEqual(s.queue, [3])
})
check('A3: 最后一题答完后进入错题重练', () => {
  const s = advance([3], [1])
  assert.deepStrictEqual(s, { queue: [1], requeue: [], enteringRepractice: true, finished: false })
})
check('A4: 错题答对后整关完成', () => {
  const s = advance([1], [])
  assert.strictEqual(s.finished, true)
  assert.deepStrictEqual(s.queue, [])
})

// 场景 B：重练时又答错 → 再次入队，反复直到答对
check('B: 重练再错会再次入队，直到答对', () => {
  // 第一次错：入队
  let requeue = enqueueWrong([], 2)
  // 首轮答完进入重练
  let s = advance([], [2])
  assert.strictEqual(s.enteringRepractice, true)
  // 重练又答错：再次入队（此时 requeue 已清空，允许重复入队）
  requeue = enqueueWrong(s.requeue, 2)
  assert.deepStrictEqual(requeue, [2])
  // 推进后队列空但有错题 → 再次进入重练
  s = advance([], [2])
  assert.strictEqual(s.enteringRepractice, true)
  // 答对 → 完成
  s = advance([], [])
  assert.strictEqual(s.finished, true)
})

// 场景 C：全部答错，所有题重练一遍
check('C: 全错时全部题目重练', () => {
  let requeue = enqueueWrong(enqueueWrong(enqueueWrong(enqueueWrong([], 0), 1), 2), 3)
  assert.deepStrictEqual(requeue, [0, 1, 2, 3])
  let s = advance([], requeue)
  assert.deepStrictEqual(s.queue, [0, 1, 2, 3])
  assert.strictEqual(s.enteringRepractice, true)
})

// 场景 D：无错题，正常通关
check('D: 无错题直接完成', () => {
  let s = { queue: [0, 1], requeue: [], enteringRepractice: false, finished: false }
  s = advance(s.queue, s.requeue)
  s = advance(s.queue, s.requeue)
  assert.strictEqual(s.finished, true)
})

// 场景 E：重复答错的题不重复入队
check('E: 重练队列去重', () => {
  let requeue = enqueueWrong([], 1)
  requeue = enqueueWrong(requeue, 1)
  assert.deepStrictEqual(requeue, [1])
})

// 模拟完整一关：4 题，Q1 对、Q2 错、Q3 对、Q4 错、重练 Q2 对、Q4 错、Q4 对
check('F: 完整闯关流程模拟', () => {
  let queue = [0, 1, 2, 3]
  let requeue = []
  let s
  const answers = ['ok', 'wrong', 'ok', 'wrong', 'ok', 'wrong', 'ok'] // 依次答题结果
  let i = 0
  let finished = false
  let enterCount = 0
  while (!finished && i < answers.length) {
    const cur = queue[0]
    const ok = answers[i] === 'ok'
    if (!ok) requeue = enqueueWrong(requeue, cur)
    s = advance(queue, requeue)
    queue = s.queue
    requeue = s.requeue
    if (s.enteringRepractice) enterCount++
    finished = s.finished
    i++
  }
  assert.strictEqual(finished, true, '应完成整关')
  assert.strictEqual(enterCount, 2, '应进入重练阶段 2 次')
  assert.strictEqual(i, 7, '共答 7 次')
})

console.log(`\n全部 ${passed} 组测试通过 ✅`)
