// 从课程数据中提取所有需要发音的英文文本，输出 JSON 数组
// 只提取英文（含中文字符的选项是中文，不需要发音）
import { COURSE } from '../src/data/course'

const isEnglish = (s: string) => /^[a-zA-Z][a-zA-Z '\-]*$/.test(s.trim())

const texts = new Set<string>()
COURSE.forEach((u) =>
  u.lessons.forEach((l) => {
    l.vocab.forEach((v) => {
      if (isEnglish(v.en)) texts.add(v.en.trim())
    })
    l.questions.forEach((q) => {
      if (q.type === 'choice') {
        q.options.forEach((o) => {
          if (isEnglish(o)) texts.add(o.trim())
        })
      } else {
        q.bank.forEach((b) => {
          if (isEnglish(b)) texts.add(b.trim())
        })
      }
    })
  })
)
console.log(JSON.stringify([...texts]))
