import Taro from '@tarojs/taro'

/**
 * 发音服务：播放预生成的 mp3 音频。
 * 文件由 scripts/gen_audio_edge.py 生成（Edge-TTS en-US-AriaNeural）。
 * 默认走微信云存储（cloud:// fileID），主包不打包音频；
 * 本地 /assets/audio/ 存在同名文件时优先本地（离线可用）。
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

/**
 * 云存储配置：音频上传到微信云存储 audio/ 目录后，
 * 把控制台里任意一个文件的 fileID 前缀（cloud://环境ID.存储桶名）填到这里。
 * 为空字符串时使用本地路径。
 */
const CLOUD_AUDIO_PREFIX = '' // 例：'cloud://dev-d1go1t1hm3ca66be2.6465-dev-d1go1t1hm3ca66be2-1330069340'

/** 播放英文发音；无对应音频时静默忽略 */
export function speak(text: string): void {
  const key = sanitizeKey(normalizeSpeakText(text))
  if (!key) return
  try {
    const a = getAudio()
    a.stop()
    a.src = CLOUD_AUDIO_PREFIX
      ? `${CLOUD_AUDIO_PREFIX}/audio/${key}.mp3`
      : `/assets/audio/${key}.mp3`
    a.play()
  } catch (err) {
    // 音频缺失或播放失败不影响答题流程
  }
}
