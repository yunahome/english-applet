// 云函数：探测云存储 audio/ 目录中缺失的音频文件
// 在云开发控制台「云函数 → checkAudio → 测试」中运行，event 传 {} 即可检查全部
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 全部音频文件名（不含扩展名），与本地 223 个 mp3 一一对应
const ALL_KEYS = [
  
]

exports.main = async (event) => {
  const keys = Array.isArray(event.keys) && event.keys.length > 0 ? event.keys : ALL_KEYS
  const prefix = 'audio/'
  const missing = []
  const ok = []

  // getTempFileURL 每次最多 50 个
  for (let i = 0; i < keys.length; i += 50) {
    const batch = keys.slice(i, i + 50)
    const fileList = batch.map((k) => `${prefix}${k}.mp3`)
    try {
      const res = await cloud.getTempFileURL({ fileList })
      for (const item of res.fileList || []) {
        if (item.status === 0) {
          ok.push(item.fileID)
        } else {
          missing.push(item.fileID)
        }
      }
    } catch (err) {
      return { ok: false, error: err.message || String(err) }
    }
  }

  return {
    ok: true,
    total: keys.length,
    found: ok.length,
    missingCount: missing.length,
    // 只返回文件名，便于对照补传
    missing: missing.map((f) => f.replace(prefix, ''))
  }
}
