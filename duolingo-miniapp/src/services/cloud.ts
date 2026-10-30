import Taro from '@tarojs/taro'

/**
 * 微信云开发进度同步封装。
 * 采用「本地优先 + 云端异步同步」：
 * - 每次状态变化后，节流上传到云端
 * - 冷启动时从云端拉取，若云端更新则以云端为准（用于换机恢复）
 *
 * 说明：需在 app 入口调用 Taro.cloud.init({ env: '你的环境ID' }) 才能使用。
 */

// ⚠️ 环境 ID：在微信开发者工具 → 云开发 → 设置 中查看并填入这里
// 例如 'cloud1-xxxxxx'。留空则云同步自动降级为纯本地存储（不影响本地使用）。
const CLOUD_ENV = 'dev-d1go1t1hm3ca66be2'

let cloudReady = false

/** 初始化云环境；返回是否可用 */
export function initCloud(): boolean {
  if (CLOUD_ENV && Taro.cloud) {
    try {
      Taro.cloud.init({ env: CLOUD_ENV, traceUser: true })
      cloudReady = true
    } catch (err) {
      cloudReady = false
    }
  }
  return cloudReady
}

/** 上传进度到云端（fire-and-forget） */
export async function uploadProgress(progress: unknown): Promise<void> {
  if (!cloudReady) return
  try {
    await Taro.cloud.callFunction({ name: 'saveProgress', data: { progress } })
  } catch (err) {
    // 云端失败不影响本地使用
  }
}

/** 从云端拉取进度；无数据或失败返回 null */
export async function downloadProgress(): Promise<unknown | null> {
  if (!cloudReady) return null
  try {
    const res = await Taro.cloud.callFunction({ name: 'loadProgress' })
    const result = res?.result as { ok?: boolean; progress?: unknown } | undefined
    if (result?.ok && result.progress) return result.progress
    return null
  } catch (err) {
    return null
  }
}
