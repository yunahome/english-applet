// 云函数：中转获取音频临时播放链接（管理端权限，绕过存储安全规则）
// 前端调用：cloud.callFunction({ name: 'getAudioUrl', data: { keys: ['hi', 'hello'] } })
// 返回：{ ok, urls: { key: 'https://...' } }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CLOUD_ENV = 'dev-d1go1t1hm3ca66be2'
const CLOUD_BUCKET = '6465-dev-d1go1t1hm3ca66be2-1520659687'
const AUDIO_DIR = 'audio'

exports.main = async (event) => {
  const keys = Array.isArray(event.keys) ? event.keys : []
  if (keys.length === 0) {
    return { ok: false, error: '缺少 keys 字段' }
  }

  // 限制单次请求数量，避免超时
  const batch = keys.slice(0, 20)
  const fileList = batch.map((k) => {
    const safe = String(k).replace(/\.\./g, '').replace(/^\//, '')
    return `cloud://${CLOUD_ENV}.${CLOUD_BUCKET}/${AUDIO_DIR}/${safe}.mp3`
  })

  try {
    const res = await cloud.getTempFileURL({ fileList })
    const urls = {}
    res.fileList.forEach((item, i) => {
      if (item.status === 0 && item.tempFileURL) {
        urls[batch[i]] = item.tempFileURL
      }
    })
    return { ok: true, urls }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
}
