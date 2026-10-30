export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/lesson/index',
    'pages/words/index',
    'pages/profile/index'
  ],
  tabBar: {
    color: '#AFB3B5',
    selectedColor: '#58CC02',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '学习',
        iconPath: 'assets/tabbar/learn.png',
        selectedIconPath: 'assets/tabbar/learn-active.png'
      },
      {
        pagePath: 'pages/words/index',
        text: '词库',
        iconPath: 'assets/tabbar/words.png',
        selectedIconPath: 'assets/tabbar/words-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: 'Duo英语',
    navigationBarTextStyle: 'black'
  }
})
