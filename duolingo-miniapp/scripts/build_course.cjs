// 读取 题库/duolingo-题库.xlsx，校验并生成 src/data/units.json
// 用法：npm run build:course
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const PROJECT_ROOT = path.join(__dirname, '..')
const XLSX_PATH = path.join(PROJECT_ROOT, '题库', 'duolingo-题库.xlsx')
const OUT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'units.json')

const UNIT_META = [
  { id: 'unit-1', title: '第 1 单元 · 入门核心 100 词', color: '#58CC02', sheet: '第一单元词汇' },
  { id: 'unit-2', title: '第 2 单元 · 家庭与朋友', color: '#1CB0F6', sheet: '第二单元词汇' },
  { id: 'unit-3', title: '第 3 单元 · 学校与学习', color: '#CE82FF', sheet: '第三单元词汇' },
  { id: 'unit-4', title: '第 4 单元 · 饮食与健康', color: '#FF9600', sheet: '第四单元词汇' },
  { id: 'unit-5', title: '第 5 单元 · 购物与金钱', color: '#FFC800', sheet: '第五单元词汇' },
  { id: 'unit-6', title: '第 6 单元 · 城市与出行', color: '#FF4B4B', sheet: '第六单元词汇' },
  { id: 'unit-7', title: '第 7 单元 · 工作与职业', color: '#2B70C9', sheet: '第七单元词汇' },
  { id: 'unit-8', title: '第 8 单元 · 旅行与世界', color: '#4CB786', sheet: '第八单元词汇' }
]
const LESSONS_PER_UNIT = 100

const wb = XLSX.readFile(XLSX_PATH)

// ---------- 工具 ----------
function sanitizeWord(w) {
  return w.replace(/[^a-zA-Z ]/g, '').trim()
}

function splitSentence(sentence) {
  return sentence.replace(/[^a-zA-Z ]/g, '').split(/\s+/).filter(Boolean)
}

function distractors(pool, exclude, count, seed) {
  // 确定性伪随机：同一种子产生同样的干扰项，保证构建产物稳定
  const picked = []
  if (!pool || pool.length === 0) return picked
  let i = seed % pool.length
  let visited = 0
  while (picked.length < count && visited < pool.length) {
    const candidate = pool[i % pool.length]
    if (!exclude.includes(candidate) && !picked.includes(candidate)) picked.push(candidate)
    i += 7
    visited++ // 无论是否入选都前进，避免死循环
  }
  return picked
}

// ---------- 读取各单元词汇 ----------
const allEnWords = [] // 全局英文单词池（用于英文选项干扰项与查重）
const enSeen = new Map()

// 中文干扰项池：预扫描所有 sheet 的中文列
const ZH_POOL = []
// 英文干扰项池：预扫描所有 sheet 的英文列（必须先全量收集，再生成题目）
const EN_POOL = []
for (const meta of UNIT_META) {
  const sheet = wb.Sheets[meta.sheet]
  if (!sheet) continue
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    if (row[2]) ZH_POOL.push(String(row[2]))
    if (row[1]) EN_POOL.push(String(row[1]).trim())
  }
}

const units = []

for (const meta of UNIT_META) {
  const sheet = wb.Sheets[meta.sheet]
  if (!sheet) {
    // 该单元尚未在 Excel 中维护 → 生成占位（仅解锁逻辑需要结构）
    units.push({
      ...meta,
      ready: false,
      lessons: Array.from({ length: LESSONS_PER_UNIT }, (_, i) => ({
        id: `${meta.id}-l${i + 1}`,
        title: `第 ${i + 1} 关`,
        vocab: [],
        questions: []
      }))
    })
    continue
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const header = rows[0]
  if (!header || header[0] !== '关卡号') {
    throw new Error(`Sheet「${meta.sheet}」表头不正确，应为：关卡号 / 英文 / 中文 / 例句 / 例句中文 / 主题`)
  }

  const lessons = []
  for (let r = 1; r < rows.length; r++) {
    const [no, en, zh, sent, sentZh] = rows[r]
    if (!en || !zh || !sent || !sentZh) continue // 跳过空行
    const noNum = Number(no)
    if (!noNum || noNum < 1 || noNum > LESSONS_PER_UNIT) {
      throw new Error(`Sheet「${meta.sheet}」第 ${r + 1} 行关卡号非法: ${no}`)
    }
    const key = String(en).trim().toLowerCase()
    if (enSeen.has(key)) {
      throw new Error(`英文单词「${en}」重复：${meta.sheet} 第 ${noNum} 关 与 ${enSeen.get(key)}`)
    }
    enSeen.set(key, `${meta.sheet} 第 ${noNum} 关`)
    allEnWords.push(String(en).trim())

    const lessonId = `${meta.id}-l${noNum}`
    const enPool = EN_POOL
    const zhPool = unitsZhPool(zh)
    const seed = noNum * 13 + meta.id.length * 7

    // 题目 1：看英文选中文
    const zhDistractors = distractors(zhPool, [String(zh)], 3, seed)
    const zhOptions = shuffleDeterministic([String(zh), ...zhDistractors], seed)
    // 题目 2：看中文选英文
    const enDistractors = distractors(enPool, [String(en)], 3, seed + 5)
    const enOptions = shuffleDeterministic([String(en), ...enDistractors], seed + 5)
    // 题目 3：例句组句（干扰词需与句中单词大小写不敏感地不同，避免混淆）
    const words = splitSentence(String(sent))
    const lowerWords = words.map((w) => w.toLowerCase())
    const bankDistractors = distractors(
      EN_POOL.filter((w) => !lowerWords.includes(w.toLowerCase())),
      [],
      2,
      seed + 11
    )
    const bank = shuffleDeterministic([...words, ...bankDistractors], seed + 11)

    lessons[noNum - 1] = {
      id: lessonId,
      title: `${noNum}. ${String(en)}`,
      vocab: [{ en: String(en), zh: String(zh) }],
      questions: [
        {
          type: 'choice',
          question: `选出「${en}」的中文`,
          options: zhOptions,
          answer: String(zh)
        },
        {
          type: 'choice',
          question: `选出「${zh}」的英文`,
          options: enOptions,
          answer: String(en)
        },
        {
          type: 'translate',
          question: `把「${sentZh}」翻译成英文`,
          answer: words,
          bank
        }
      ]
    }
  }

  // 校验 100 关填满
  const missing = []
  for (let i = 0; i < LESSONS_PER_UNIT; i++) {
    if (!lessons[i]) missing.push(i + 1)
  }
  if (missing.length) {
    throw new Error(`Sheet「${meta.sheet}」缺少关卡: ${missing.join(', ')}`)
  }

  units.push({ ...meta, ready: true, lessons })
  console.log(`✓ ${meta.title}: ${lessons.length} 关已生成`)
}

// 中文选项直接从预扫描的 ZH_POOL 取干扰项
function unitsZhPool(currentZh) {
  return ZH_POOL
}

// ---------- 确定性洗牌 ----------
function shuffleDeterministic(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- 输出 ----------
const output = {
  generatedAt: new Date().toISOString(),
  lessonsPerUnit: LESSONS_PER_UNIT,
  units: units.map((u) => ({
    id: u.id,
    title: u.title,
    color: u.color,
    ready: u.ready,
    lessons: u.lessons
  }))
}
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, JSON.stringify(output))
console.log(`\n已生成 ${OUT_PATH}`)
console.log(
  `统计: ${units.filter((u) => u.ready).length} 个单元就绪 / 共 ${enSeen.size} 个不重复单词`
)
