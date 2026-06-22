export default defineAppConfig({
  plugins: {
    materialPlugin: {
      version: '1.0.13',
      provider: 'wx4d2deeab3aed6e5a'
    }
  },
  pages: [
    'pages/index/index',
    'pages/calendar/index',
    'pages/mine/index',
    'pages/day/index',
    'pages/detail/index',
    'pages/performer/index',
    'pages/favorites/index',
    'pages/follows/index',
    'pages/login/index',
    'pages/profile/index',
    'pages/webview/index'
  ],
  darkmode: true,
  themeLocation: 'theme.json',
  permission: {
    'scope.addPhoneCalendar': {
      desc: '用于将演出提醒添加到系统日历'
    }
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '@navBgColor',
    navigationBarTitleText: 'FORENOTE有谱',
    navigationBarTextStyle: '@navTxtStyle',
    backgroundColor: '@bgColor'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#c9a96a',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home_on.png'
      },
      {
        pagePath: 'pages/calendar/index',
        text: '',
        iconPath: 'assets/tab/calendar.png',
        selectedIconPath: 'assets/tab/calendar_on.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '',
        iconPath: 'assets/tab/mine.png',
        selectedIconPath: 'assets/tab/mine_on.png'
      }
    ]
  }
})
