// 批量生成单词发音音频：macOS say 合成 → afconvert 转 m4a(AAC)
// 用法：node scripts/gen_audio.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const texts = require('/tmp/audio_texts.json')
const OUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'audio')
fs.mkdirSync(OUT_DIR, { recursive: true })

function sanitizeKey(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// 选择一个可用的英文语音
function pickVoice() {
  try {
    const list = execFileSync('say', ['-v', '?'], { encoding: 'utf8' })
    for (const v of ['Samantha (en_US)', 'Ava (en_US)', 'Karen (en_AU)', 'Daniel (en_GB)']) {
      if (list.includes(v)) return v.split(' (')[0]
    }
  } catch (e) {
    /* 忽略 */
  }
  return ''
}

const voice = pickVoice()
console.log('使用语音:', voice || '系统默认')

let ok = 0
let fail = 0
for (const text of texts) {
  const key = sanitizeKey(text)
  if (!key) continue
  const out = path.join(OUT_DIR, `${key}.m4a`)
  if (fs.existsSync(out) && fs.statSync(out).size > 1000) {
    ok++
    continue // 已存在则跳过
  }
  const tmpAiff = `/tmp/duo-tts-${key}.aiff`
  try {
    const args = voice ? ['-v', voice] : []
    execFileSync('say', [...args, '-o', tmpAiff, text], { timeout: 15000 })
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', '-c', '1', tmpAiff, out], {
      timeout: 15000
    })
    ok++
  } catch (e) {
    fail++
    console.error('失败:', text, e.message)
  } finally {
    try {
      fs.unlinkSync(tmpAiff)
    } catch (e) {
      /* 忽略 */
    }
  }
}
console.log(`完成: 成功 ${ok} / 失败 ${fail}`)
