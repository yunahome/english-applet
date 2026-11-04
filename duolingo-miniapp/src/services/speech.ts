import Taro from '@tarojs/taro'

/**
 * 发音服务：播放预生成的 mp3 音频。
 * 通过云函数 getAudioUrl 中转获取临时播放链接（管理端权限，绕过存储安全规则限制）。
 * 优化：
 *  - 临时链接本地持久化缓存（2 小时内复用，跨页面/跨启动免调云函数）
 *  - 支持批量预取（一次云函数调用取多个词的链接）
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

// 本地持久化缓存的 key
const CACHE_STORAGE_KEY = 'duo_audio_url_cache'
// 临时链接有效期（微信 getTempFileURL 约 2 小时，留 30 分钟余量）
const CACHE_TTL = 90 * 60 * 1000

interface CacheEntry {
  [key: string]: { url: string; at: number }
}

// 内存缓存（本次会话内最快）
const memoryCache = new Map<string, string>()

function loadCache(): CacheEntry {
  try {
    const saved = Taro.getStorageSync(CACHE_STORAGE_KEY)
    if (saved && typeof saved === 'object') return saved as CacheEntry
  } catch (err) {
    // 忽略
  }
  return {}
}

function saveCache(cache: CacheEntry): void {
  try {
    Taro.setStorageSync(CACHE_STORAGE_KEY, cache)
  } catch (err) {
    // 忽略
  }
}

/** 从本地缓存取链接（内存 → 本地存储），命中且未过期则返回 */
function getCachedUrl(key: string): string | null {
  const mem = memoryCache.get(key)
  if (mem) return mem

  const cache = loadCache()
  const entry = cache[key]
  if (entry && entry.url && Date.now() - entry.at < CACHE_TTL) {
    memoryCache.set(key, entry.url)
    return entry.url
  }
  return null
}

/** 写入缓存（内存 + 本地存储） */
function setCachedUrl(key: string, url: string): void {
  memoryCache.set(key, url)
  const cache = loadCache()
  cache[key] = { url, at: Date.now() }
  saveCache(cache)
}

/** 通过云函数批量获取音频临时链接，并写入缓存 */
async function fetchUrls(keys: string[]): Promise<Record<string, string>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await Taro.cloud.callFunction({
      name: 'getAudioUrl',
      data: { keys }
    })
    const urls: Record<string, string> = res?.result?.urls ?? {}
    for (const k of Object.keys(urls)) {
      setCachedUrl(k, urls[k])
    }
    return urls
  } catch (err) {
    console.warn('[speech] 云函数调用异常', keys, err)
    return {}
  }
}

/** 解析单个词的播放链接（优先缓存，未命中则调云函数） */
async function resolveAudioSrc(key: string): Promise<string | null> {
  const cached = getCachedUrl(key)
  if (cached) return cached
  const urls = await fetchUrls([key])
  return urls[key] ?? null
}

/**
 * 预取一批词的播放链接（后台静默，不阻塞）。
 * 在题目渲染时调用，点击发音时即可命中缓存，秒播。
 */
export function prefetchAudio(texts: string[]): void {
  const keys = texts
    .map((t) => sanitizeKey(normalizeSpeakText(t)))
    .filter((k) => k && !getCachedUrl(k))
  if (keys.length === 0) return
  // 去重
  const unique = Array.from(new Set(keys))
  fetchUrls(unique).catch(() => {
    /* 预取失败不影响，点击时仍会单独再取 */
  })
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

  // 命中缓存直接播（不 await，同步快）
  const cached = getCachedUrl(key)
  if (cached) {
    play(cached)
    return
  }

  resolveAudioSrc(key).then((src) => {
    if (src) play(src)
  })
}
