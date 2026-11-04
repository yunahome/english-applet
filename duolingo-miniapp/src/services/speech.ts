import Taro from '@tarojs/taro'

/**
 * 发音服务：播放预生成的 mp3 音频。
 * 文件由 scripts/gen_audio_edge.py 生成（Edge-TTS en-US-AriaNeural）。
 * 通过云函数 getAudioUrl 中转获取临时播放链接（管理端权限，绕过存储安全规则限制）。
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

/** 发音文本修正：代词 I 与 eye 同音，单字母 I 重定向到正确发音 */
function normalizeSpeakText(text: string): string {
  const t = text.trim()
  if (t === 'I' || t === 'i') return 'eye'
  return t
}

// 临时 URL 缓存：避免每次发音都调云函数（临时链接有效期约 2 小时）
const tempUrlCache = new Map<string, string>()

/** 通过云函数 getAudioUrl 获取音频临时播放链接 */
async function resolveAudioSrc(key: string): Promise<string | null> {
  const cached = tempUrlCache.get(key)
  if (cached) return cached

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await Taro.cloud.callFunction({
      name: 'getAudioUrl',
      data: { keys: [key] }
    })
    const urls = res?.result?.urls
    if (urls && urls[key]) {
      tempUrlCache.set(key, urls[key])
      return urls[key]
    }
    console.warn('[speech] 云函数未返回该音频链接', key)
    return null
  } catch (err) {
    console.warn('[speech] 云函数调用异常', key, err)
    return null
  }
}

/** 播放英文发音；无对应音频时静默忽略 */
export function speak(text: string): void {
  const key = sanitizeKey(normalizeSpeakText(text))
  if (!key) return

  const play = (src: string) => {
    try {
      const a = getAudio()
      a.stop()
      a.onError(() => {
        console.warn('[speech] 播放失败', src)
      })
      a.src = src
      a.play()
    } catch (err) {
      console.warn('[speech] 播放异常', err)
    }
  }

  resolveAudioSrc(key).then((src) => {
    if (src) play(src)
  })
}
