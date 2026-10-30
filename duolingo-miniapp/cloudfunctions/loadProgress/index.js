// 云函数：读取学习进度
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  try {
    const res = await db.collection('user_progress').where({ openid: OPENID }).limit(1).get()
    if (res.data.length === 0) {
      return { ok: true, progress: null }
    }
    return { ok: true, progress: res.data[0] }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
}
