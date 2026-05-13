# ⚔️ 像素机甲对决 - Pixel Mecha Battle

[![Made with Trae](https://img.shields.io/badge/Made%20with-Trae-6C5CE7?style=flat-square)](https://trae.ai)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange.svg?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

> 🎮 一个基于 HTML5 Canvas 的双人像素风机甲格斗游戏，支持挑战者模式和真人对决模式。

## ✨ 特性

- 🎯 **两种游戏模式**
  - 🏆 **挑战者模式**：单人闯关，挑战3个AI敌人
  - 👥 **真人对决**：双人在同一键盘对战

- 🤖 **智能AI系统**
  - 自动追踪与攻击决策
  - 格挡反应与跳跃躲避
  - 三关难度递增

- 🎨 **独特角色设计**
  - 4个不同外观的机甲角色
  - 中文帅气名称
  - 专属光环与特效

- ⚡ **丰富战斗系统**
  - 拳击/腿踢/空中攻击
  - 部位判定（头部伤害翻倍）
  - 格挡防御机制
  - 浮动伤害数字与屏幕震动

## 🚀 快速开始

### 🎮 在线试玩

**👉 [点击这里立即试玩](https://pixelmechabattle-2ouxr01ht.maozi.io/)**

无需下载，直接在浏览器中即可体验！

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/yourusername/pixel-mecha-battle.git

# 进入目录
cd pixel-mecha-battle

# 用浏览器打开游戏
open index.html
```

## 🎮 操作说明

### 玩家1（苍穹战甲）
| 按键 | 动作 |
|------|------|
| A / D | 左右移动 |
| W | 跳跃 |
| G | 拳击 |
| F | 腿踢 |
| H | 防御/格挡 |

### 玩家2（真人对决模式）
| 按键 | 动作 |
|------|------|
| ← / → | 左右移动 |
| ↑ | 跳跃 |
| . | 拳击 |
| / | 腿踢 |
| L | 防御/格挡 |

## 👾 角色介绍

| 角色 | 名称 | 特征 | 出现关卡 |
|------|------|------|---------|
| 🔵 | **苍穹战甲** | 标准体型，青色光芒 | 玩家1 |
| 🔴 | **赤焰霸者** | 魁梧体型，双角，红色 | 第1关 |
| 🟣 | **幽影裁决** | 纤细体型，紫色翅膀 | 第2关 |
| 🟡 | **金甲战神** | 魁梧体型，王冠，金色 | 第3关 |

## 🛠️ 技术栈

- **HTML5 Canvas** - 游戏渲染
- **原生 JavaScript** - 游戏逻辑
- **CSS3** - UI样式与动画

## 📁 项目结构

```
pixel-mecha-battle/
├── index.html          # 游戏主页面
├── game.js             # 游戏核心逻辑
├── README.md           # 项目说明
└── LICENSE             # 许可证
```

## 🎯 游戏机制

### 攻击系统
- **拳击**：快速，伤害 8-14
- **腿踢**：稍慢，伤害 12-20，距离更远
- **空中攻击**：跳跃时可发动，伤害更高

### 伤害判定
- 击中身体：正常伤害
- **击中头部**：伤害 × 2，显示"爆头"特效

### 能量系统
- 攻击消耗能量
- 格挡消耗能量但抵消伤害
- 能量自动缓慢恢复

## 📝 开发说明

本项目使用 [Trae](https://trae.ai) AI IDE 开发完成。

### 核心代码结构

```javascript
// 机甲类
class Mecha {
  // 属性：位置、速度、血量、能量
  // 方法：更新、绘制、攻击、受伤
}

// AI控制器
class AIController {
  // 追踪、攻击决策、防御反应
}

// 粒子系统
class Particle {
  // 火花、烟雾、能量粒子特效
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- 使用 [Trae](https://trae.ai) AI IDE 开发
- 灵感来自经典格斗游戏

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
