import { defineConfig } from '@tarojs/cli'

import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig(async (merge) => {
  // 按目标平台分目录输出，避免微信端与抖音端产物互相覆盖
  const taroEnv = process.env.TARO_ENV || 'weapp'
  const outputRootMap: Record<string, string> = {
    weapp: 'dist/weapp',
    tt: 'dist/tt',
    h5: 'dist/h5'
  }

  const baseConfig = {
    projectName: 'duolingo-miniapp',
    date: '2026-10-27',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: outputRootMap[taroEnv] || 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [
        { from: 'src/assets/home', to: 'assets/home' }
      ],
      options: {}
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: []
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false
        }
      }
    },
    h5: {}
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
