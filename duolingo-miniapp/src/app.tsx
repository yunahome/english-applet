import { Component, PropsWithChildren } from 'react'
import { AppProvider } from './store/app-store'
import { initCloud } from './services/cloud'
import './app.scss'

class App extends Component<PropsWithChildren> {
  componentDidMount() {
    // 初始化微信云开发（若已配置环境 ID，则启用进度云同步）
    initCloud()
  }

  render() {
    // 小程序类 App 最外层 Provider，为所有页面提供全局游戏状态（红心 / XP / 打卡 / 闯关进度）
    return <AppProvider>{this.props.children}</AppProvider>
  }
}

export default App
