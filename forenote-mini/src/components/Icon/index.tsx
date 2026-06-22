import { Image } from '@tarojs/components'

type IconName =
  | 'search'
  | 'star'
  | 'star-fill'
  | 'edit'
  | 'play'
  | 'pause'
  | 'chevron-left'
  | 'chevron-right'
  | 'calendar-add'
  | 'logout'
  | 'ticket'
  | 'music'
  | 'user'
  | 'info'
  | 'message'
  | 'heart'
  | 'moon'
  | 'users'

interface Props {
  name: IconName
  size?: number
  color?: string
  className?: string
}

function svg(name: IconName, color: string): string {
  const paths: Record<IconName, string> = {
    search: `<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="${color}" stroke-width="2"/><line x1="15.5" y1="15.5" x2="21" y2="21" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`,
    star: `<path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.8 6.5 20.2l1.1-6.2L3 9.6l6.3-.9z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`,
    'star-fill': `<path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.8 6.5 20.2l1.1-6.2L3 9.6l6.3-.9z" fill="${color}"/>`,
    edit: `<path d="M4 20h4l10-10-4-4L4 16z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><line x1="13" y1="6" x2="17" y2="10" stroke="${color}" stroke-width="1.8"/>`,
    play: `<path d="M8 5v14l11-7z" fill="${color}"/>`,
    pause: `<rect x="6" y="5" width="4" height="14" rx="1" fill="${color}"/><rect x="14" y="5" width="4" height="14" rx="1" fill="${color}"/>`,
    'chevron-left': `<path d="M15 5l-7 7 7 7" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    'chevron-right': `<path d="M9 5l7 7-7 7" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    'calendar-add': `<rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="${color}" stroke-width="1.8"/><line x1="3" y1="9.5" x2="21" y2="9.5" stroke="${color}" stroke-width="1.8"/><line x1="12" y1="12.5" x2="12" y2="18" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><line x1="9.2" y1="15.2" x2="14.8" y2="15.2" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`,
    logout: `<path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M17 8l4 4-4 4" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`,
    ticket: `<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" fill="none" stroke="${color}" stroke-width="1.8"/><line x1="14" y1="6" x2="14" y2="18" stroke="${color}" stroke-width="1.8" stroke-dasharray="2 2"/>`,
    music: `<path d="M9 18V6l10-2v12" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="${color}" stroke-width="1.8"/><circle cx="16" cy="16" r="3" fill="none" stroke="${color}" stroke-width="1.8"/>`,
    user: `<circle cx="12" cy="8" r="4" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`,
    info: `<circle cx="12" cy="12" r="9" fill="none" stroke="${color}" stroke-width="1.8"/><line x1="12" y1="11" x2="12" y2="16.5" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1.2" fill="${color}"/>`,
    message: `<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`,
    heart: `<path d="M12 20s-7-4.6-9.3-9.1C1.3 8 2.6 4.8 5.8 4.5c2-.2 3.4 1 4.2 2.3.8-1.3 2.2-2.5 4.2-2.3 3.2.3 4.5 3.5 3.1 6.4C19 15.4 12 20 12 20z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`,
    moon: `<path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`,
    users: `<circle cx="9" cy="8" r="3.4" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M3.5 19c0-3.3 2.6-5 5.5-5s5.5 1.7 5.5 5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M17.5 14.2c1.9.5 3.5 1.9 3.5 4.3" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`
  }
  const inner = paths[name]
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${inner}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(raw).replace(/'/g, '%27').replace(/"/g, '%22')}`
}

export default function Icon({ name, size = 40, color = '#2c2c34', className = '' }: Props) {
  const style = { width: `${size}rpx`, height: `${size}rpx` }
  return (
    <Image
      className={className}
      style={style}
      src={svg(name, color)}
      mode='aspectFit'
    />
  )
}
