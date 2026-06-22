import { WebView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { usePageShare } from '../../hooks/usePageShare'

// web-view 可加载的外链白名单（按域名前缀匹配）。
// 新增外链入口时，必须把对应域名加到这里，否则会被拦截。
// 注意：正式上线还需在微信公众平台「开发管理 → 业务域名」配置同样的域名。
const ALLOWED = [
  'https://ifdian.net/',
  'https://work.weixin.qq.com/'
]

function isAllowed(url: string): boolean {
  return ALLOWED.some(prefix => url.startsWith(prefix))
}

export default function Webview() {
  const router = useRouter()
  const url = decodeURIComponent(router.params.url || '')
  usePageShare({ title: 'FORENOTE有谱' })

  if (!url || !isAllowed(url)) {
    Taro.showToast({ title: '不支持的链接', icon: 'none' })
    setTimeout(() => Taro.navigateBack(), 800)
    return null
  }

  return <WebView src={url} />
}
