import courseData from './units.json'

/**
 * 课程数据（由 题库/duolingo-题库.xlsx 经 scripts/build_course.cjs 生成）
 * 修改题库请编辑 Excel 后运行: npm run build:course
 */

export interface ChoiceQuestion {
  type: 'choice'
  question: string
  options: string[]
  answer: string
}

export interface TranslateQuestion {
  type: 'translate'
  question: string
  answer: string[]
  bank: string[]
}

export type Question = ChoiceQuestion | TranslateQuestion

export interface Vocab {
  en: string
  zh: string
}

export interface Lesson {
  id: string
  title: string
  vocab: Vocab[]
  questions: Question[]
}

export interface Unit {
  id: string
  title: string
  color: string
  ready: boolean
  lessons: Lesson[]
}

export const LESSONS_PER_UNIT = courseData.lessonsPerUnit as number

export const COURSE = courseData.units as Unit[]

/** 通过 unitId + lessonId 找到关卡 */
export function findLesson(
  unitId: string,
  lessonId: string
): { unit: Unit; lesson: Lesson } | null {
  for (const unit of COURSE) {
    if (unit.id !== unitId) continue
    const lesson = unit.lessons.find((l) => l.id === lessonId)
    if (lesson) return { unit, lesson }
  }
  return null
}
