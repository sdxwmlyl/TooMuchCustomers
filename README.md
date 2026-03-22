<div align="center">

# 🤖 TooMuchCustomers

**AI-Powered Customer Requirements Analysis System**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.4+-brightgreen.svg)](https://vuejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>
## 🇺🇸 English

> **"Too many customers to track? Requirements too messy to organize? Let AI be your requirements secretary!"**

### What is this?

A **locally deployed** AI-powered customer requirements analysis tool for indie developers and small teams who:

- 📱 Have 99+ unread customer messages and can't tell who's who
- 📝 Scroll through chat history endlessly looking for key requirements
- 💰 Quote prices by gut feeling, then realize they undercharged
- 😵 Have customers changing requirements 800 times with no version control

**Core Philosophy**: Let AI do the dirty work, you just make the decisions!

### ✨ Features

#### 🧠 AI Smart Analysis - Your Requirements Translator
- **Chat Screenshot Recognition**: Drop a WeChat screenshot, AI extracts requirements automatically (supports local multimodal models via Ollama)
- **Structured Requirements**: Translates "we want an app" into technical solutions, feature lists, and time estimates
- **Smart Follow-ups**: AI asks "How many users?" "Need admin panel?" to avoid scope creep later

#### 📊 Customer Status Machine - Visual Sales Funnel
Not just "in progress/done", but professional 9-state workflow:

```
New → Contacted → Requirements → Analyzed → Quoted → Negotiating → Won
 ↓       ↓           ↓           ↓          ↓           ↓
Paused ←──────────────────────────────────────────────────┘
  ↓
Lost → New (Restart!)
```

#### 💬 Conversational Operations - Work Like Chatting
No clicking around, **everything happens in the chat box**:

| You Say | AI Does |
|---------|---------|
| "Analyze requirements" | Reads all materials, outputs structured analysis report |
| "Generate solution" | Produces technical plan + time estimate + risk assessment |
| "Cut the time in half" | Re-estimates with optimization suggestions |
| "Customer wants live streaming" | Records new requirement, updates solution |
| "Change status to negotiating" | Updates customer status, logs follow-up history |

#### 🎙️ Voice Processing - FunASR 2.0 Integration
- Upload customer call recordings (MP3/WAV/M4A/FLAC/OGG)
- Automatic speech-to-text with speaker diarization
- Extract Q&A pairs from conversations
- Identify customer needs automatically
- Generate timestamped analysis reports

#### 📁 Local File Storage - Your Data, Your Control
- **Zero cloud dependency**: All data stored locally, works offline
- **Customer isolation**: Each customer has their own folder
- **Format friendly**: Analysis reports are Markdown, editable anytime

#### 🔌 Flexible AI Models - Not Locked to One Provider
Supports multiple AI backends with **automatic fallback**:
- 🦙 **Ollama Local** (Recommended): Llama3.2, Llava, fully offline
- ☁️ **OpenAI API**: GPT-4, GPT-3.5
- 🤖 **Other APIs**: Claude, Wenxin, Tongyi...

### 🚀 Quick Start

```bash
# Clone
git clone git@github.com:sdxwmlyl/TooMuchCustomers.git
cd TooMuchCustomers

# Backend
cd backend && npm install && node server.js

# Frontend
cd frontend && npm install && npm run dev

# Open http://localhost:5173
```

### 📖 Documentation

See full documentation in [docs/README_EN.md](docs/README_EN.md)

---

<a name="中文"></a>
## 🇨🇳 中文

> **"客户太多记不住？需求太乱理不清？让AI当你的需求整理小秘书！"**

### 这是什么神仙工具？

一个**本地部署**的AI驱动客户需求分析神器！专为那些：

- 📱 微信里客户消息99+，分不清谁是谁
- 📝 聊天记录翻到手软，找不到关键需求
- 💰 报价全凭感觉，事后发现亏大了
- 😵 客户需求改了800遍，版本管理一团糟

的**独立开发者/小团队**量身打造。

**核心哲学**：让AI干脏活累活，你只管拍板决策！

### ✨ 产品特色

#### 🧠 AI智能分析 - 你的需求翻译官
- **聊天截图识别**：丢一张微信截图，AI自动提取需求（支持Ollama本地多模态模型）
- **需求结构化**：把"我们要做个APP"翻译成技术方案、功能清单、工时估算
- **智能追问**：AI会主动问"用户量多少？""要不要后台？"，避免后期扯皮

#### 📊 客户状态机 - 销售漏斗可视化
不是简单的"进行中/已完成"，而是专业的9状态流转：

```
新建 → 已联系 → 需求收集 → 已分析 → 已报价 → 谈判中 → 已成交
  ↓       ↓         ↓         ↓         ↓         ↓
暂停 ←──────────────────────────────────────────────┘
  ↓
已流失 → 新建（东山再起！）
```

#### 💬 对话式操作 - 像聊天一样工作
不用点来点去，**所有操作都在聊天框完成**：

| 你说 | AI做 |
|------|------|
| "帮我分析需求" | 读取所有资料，输出结构化分析报告 |
| "生成方案" | 产出技术方案+工时清单+风险评估 |
| "工时太多了，砍一半" | 重新估算，给出优化建议 |
| "客户说要加直播功能" | 记录新需求，更新方案 |
| "状态改成谈判中" | 更新客户状态，记录跟进历史 |

#### 🎙️ 语音处理 - FunASR 2.0集成
- 上传客户沟通录音（MP3/WAV/M4A/FLAC/OGG）
- 自动语音转文字，支持说话人分离
- 从对话中提取问答对
- 自动识别客户需求
- 生成带时间戳的分析报告

#### 📁 本地文件存储 - 你的数据你做主
- **零云端依赖**：所有数据存在本地文件夹，断网也能用
- **客户隔离**：每个客户独立文件夹，资料不会串
- **格式友好**：分析报告是Markdown，随时可以用Typora打开编辑

#### 🔌 AI模型自由切换 - 不绑死一家
支持多种AI后端，**主模型挂了自动降级**：
- 🦙 **Ollama本地部署**（推荐）：Llama3.2、Llava等，完全离线
- ☁️ **OpenAI API**：GPT-4、GPT-3.5
- 🤖 **其他兼容API**：Claude、文心一言、通义千问...

### 🚀 快速开始

```bash
# 克隆代码
git clone git@github.com:sdxwmlyl/TooMuchCustomers.git
cd TooMuchCustomers

# 启动后端
cd backend && npm install && node server.js

# 启动前端
cd frontend && npm install && npm run dev

# 访问 http://localhost:5173
```

### 📖 详细文档

查看完整文档 [docs/README_CN.md](docs/README_CN.md)

---

## 🛠️ Tech Stack | 技术栈

- **Backend**: Node.js + Express + SQLite3
- **Frontend**: Vue 3 + Element Plus + Pinia
- **AI**: Ollama / OpenAI API / Qwen3ASR 0.6B
- **Storage**: Local filesystem + SQLite

## 📄 License | 许可证

MIT License - Use freely, but don't blame me if it breaks 😄

---

<p align="center">
  Made with ❤️ by a developer who has <b>TooMuchCustomers</b>
</p>
