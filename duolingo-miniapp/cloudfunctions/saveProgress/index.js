// 云函数：保存学习进度到云数据库
// 集合名：user_progress，文档主键 = openid
// 首次调用时若集合不存在会自动创建
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const COLLECTION = 'user_progress'

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION)
    return true
  } catch (err) {
    // 集合已存在时会报错，忽略即可
    return false
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { progress } = event

  if (!progress || typeof progress !== 'object') {
    return { ok: false, error: '缺少 progress 字段' }
  }

  try {
    // 首次调用时自动建集合（已存在则静默跳过）
    await ensureCollection()

    const data = {
      ...progress,
      openid: OPENID,
      updatedAt: db.serverDate()
    }

    // upsert：存在则更新，不存在则创建
    const existed = await db.collection(COLLECTION).where({ openid: OPENID }).count()

    if (existed.total > 0) {
      await db.collection(COLLECTION).where({ openid: OPENID }).update({
        data: { ...progress, updatedAt: db.serverDate() }
      })
    } else {
      await db.collection(COLLECTION).add({ data })
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
}
