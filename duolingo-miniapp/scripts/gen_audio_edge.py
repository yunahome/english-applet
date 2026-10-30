#!/usr/bin/env python3
"""用 Edge-TTS 批量生成高质量发音音频，替换 say 机械音。

- 语音：en-US-AriaNeural（女声，清晰自然）
- 输出：mp3（Edge-TTS 原生格式，微信/抖音/H5 均支持）
- 文件名规则与前端 speech.ts 的 sanitizeKey 保持一致（小写+下划线）
- 单字母 "I"/"i" 特殊处理：用 "eye" 的文本合成，保证读成代词音
"""
import asyncio
import json
import os
import sys

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets', 'audio')
VOICE = 'en-US-AriaNeural'

# 从 dump 的文本清单读取（/tmp/audio_texts.json 由 dump_audio_texts.ts 生成）
TEXTS_PATH = '/tmp/audio_texts.json'


def sanitize_key(text):
    return (
        text.strip()
        .lower()
        .replace(' ', '_')
        .replace('-', '_')
        .replace("'", '')
        .replace('?', '')
        .replace('!', '')
        .replace('.', '')
        .replace(',', '')
        .strip('_')
    )


async def synth(text, out_path):
    """用 edge-tts 合成单条音频。"""
    import edge_tts

    # 代词 I 发音修正：单字母 I/i 用 "eye" 文本合成（同音）
    speak_text = 'eye' if text.strip().lower() == 'i' else text
    communicate = edge_tts.Communicate(speak_text, VOICE)
    await communicate.save(out_path)


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(TEXTS_PATH) as f:
        texts = json.load(f)

    ok = 0
    fail = 0
    sem = asyncio.Semaphore(6)  # 限制并发，避免被限流

    async def worker(text):
        nonlocal ok, fail
        key = sanitize_key(text)
        if not key:
            return
        out = os.path.join(OUT_DIR, f'{key}.mp3')
        # 已存在且非空则跳过（用大小>100字节判断）
        if os.path.exists(out) and os.path.getsize(out) > 100:
            ok += 1
            return
        async with sem:
            try:
                await synth(text, out)
                ok += 1
            except Exception as e:
                fail += 1
                print(f'  失败: {text} -> {e}', file=sys.stderr)

    await asyncio.gather(*(worker(t) for t in texts))
    print(f'完成: 成功 {ok} / 失败 {fail}')


if __name__ == '__main__':
    asyncio.run(main())
