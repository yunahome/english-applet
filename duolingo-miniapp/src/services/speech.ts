import Taro from '@tarojs/taro'

/**
 * 发音服务：播放预生成的 mp3 音频。
 * 文件由 scripts/gen_audio_edge.py 生成（Edge-TTS en-US-AriaNeural）。
 * 优先走微信云存储（cloud:// fileID → getTempFileURL 转临时 https），
 * 主包不打包音频，减小体积。
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

/**
 * 云存储配置：音频 fileID 前缀（cloud://环境ID.存储桶名）。
 * 通过 getTempFileURL 把 fileID 转成临时 https 链接播放。
 */
const CLOUD_AUDIO_PREFIX = 'cloud://dev-d1go1t1hm3ca66be2.6465-dev-d1go1t1hm3ca66be2-1520659687'

/**
 * 音频在云存储中的子目录名。为空表示文件直接放在存储桶根目录。
 * 上传时若拖进了名为 audio 的文件夹，这里填 'audio'；若直接拖到根目录，这里填空字符串。
 */
const CLOUD_AUDIO_DIR = 'audio'

// 临时 URL 缓存：避免每次发音都调用 getTempFileURL（临时链接有效期约 2 小时）
const tempUrlCache = new Map<string, string>()

/** 将 cloud:// fileID 转换为可播放的临时 https 链接；失败返回 null */
async function resolveAudioSrc(fileID: string): Promise<string | null> {
  const cached = tempUrlCache.get(fileID)
  if (cached) return cached

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await Taro.cloud.getTempFileURL({ fileList: [fileID] })
    const item = res?.fileList?.[0]
    if (item && item.status === 0 && item.tempFileURL) {
      tempUrlCache.set(fileID, item.tempFileURL)
      return item.tempFileURL
    }
    // status !== 0 表示文件不存在或权限不足
    console.warn('[speech] getTempFileURL 失败', fileID, item)
    return null
  } catch (err) {
    console.warn('[speech] getTempFileURL 异常', fileID, err)
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

  // 未配置云环境时，回退到本地路径
  if (!CLOUD_AUDIO_PREFIX) {
    play(`/assets/audio/${key}.mp3`)
    return
  }

  // 拼接 fileID：子目录存在则带目录前缀
  const dir = CLOUD_AUDIO_DIR ? `${CLOUD_AUDIO_DIR}/` : ''
  const fileID = `${CLOUD_AUDIO_PREFIX}/${dir}${key}.mp3`

  resolveAudioSrc(fileID).then((src) => {
    if (src) play(src)
  })
}
