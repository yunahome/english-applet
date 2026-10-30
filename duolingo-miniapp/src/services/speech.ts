import Taro from '@tarojs/taro'

/**
 * 发音服务：播放打包在 /assets/audio/ 下的预生成 m4a 音频。
 * 文件由 scripts/gen_audio.cjs 生成（macOS say + afconvert），
 * 文件名 = 英文文本小写、非字母数字合并为下划线。
 * 优点：微信/抖音/H5 三端通用，无需插件与审批。
 */

let audio: ReturnType<typeof Taro.createInnerAudioContext> | null = null

function getAudio() {
  if (!audio) {
    audio = Taro.createInnerAudioContext()
    audio.obeyMuteSwitch = false // 不跟随系统静音开关（学习场景需要出声）
  }
  return audio
}

/** 英文文本 -> 音频文件名（与 scripts/gen_audio_edge.py 的 sanitize_key 保持一致） */
export function sanitizeKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/-/g, '_')
    .replace(/'/g, '')
    .replace(/\?/g, '')
    .replace(/!/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/^_+|_+$/g, '')
}

/** 发音文本修正：`say` 对单个 "I" 会读成字母音，代词 I 与 eye 同音，重定向到正确发音 */
function normalizeSpeakText(text: string): string {
  const t = text.trim()
  // 代词 I（单独成词或 "I am" 等，单字母 I）→ 用 eye 的发音
  if (t === 'I' || t === 'i') return 'eye'
  return t
}

/** 播放英文发音；无对应音频时静默忽略 */
export function speak(text: string): void {
  const key = sanitizeKey(normalizeSpeakText(text))
  if (!key) return
  try {
    const a = getAudio()
    a.stop()
    a.src = `/assets/audio/${key}.m4a`
    a.play()
  } catch (err) {
    // 音频缺失或播放失败不影响答题流程
  }
}
