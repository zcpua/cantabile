import { defineConfig } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'forenote-mini',
    date: '2026-6-14',
    designWidth(input: any) {
      // NutUI 组件按 375 设计，其余按 750
      if (input?.file?.replace(/\\+/g, '/').indexOf('@nutui') > -1) {
        return 375
      }
      return 750
    },
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
      375: 2 / 1
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {
      __APP_WX_CLOUD_ENV__: JSON.stringify(process.env.TARO_APP_WX_CLOUD_ENV || ''),
      __APP_WX_CLOUD_SERVICE__: JSON.stringify(process.env.TARO_APP_WX_CLOUD_SERVICE || 'forenote')
    },
    copy: {
      patterns: [
        { from: 'src/assets/tab/home_dark.png', to: 'dist/assets/tab/home_dark.png' },
        { from: 'src/assets/tab/calendar_dark.png', to: 'dist/assets/tab/calendar_dark.png' },
        { from: 'src/assets/tab/mine_dark.png', to: 'dist/assets/tab/mine_dark.png' }
      ],
      options: {}
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
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
