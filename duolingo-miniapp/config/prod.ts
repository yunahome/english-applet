import type { UserConfigExport } from '@tarojs/cli'

export default {
  mini: {},
  h5: {
    /**
     * WebpackChain 插件配置（h5 端）
     */
    miniCssExtractPluginOption: {
      ignoreOrder: true
    }
  }
} satisfies UserConfigExport
