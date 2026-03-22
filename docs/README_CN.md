# TooMuchCustomers - 完整使用文档

## 目录

1. [安装部署](#安装部署)
2. [配置说明](#配置说明)
3. [使用指南](#使用指南)
4. [语音处理](#语音处理)
5. [API接口](#api接口)
6. [开发扩展](#开发扩展)

---

## 安装部署

### 环境要求

- Node.js 18+（推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理）
- AI模型（本地Ollama或OpenAI API Key）
- FFmpeg（可选，用于音频格式转换）

### 安装步骤

```bash
# 1. 克隆仓库
git clone git@github.com:sdxwmlyl/TooMuchCustomers.git
cd TooMuchCustomers

# 2. 安装后端依赖
cd backend
npm install

# 3. 安装前端依赖
cd ../frontend
npm install

# 4. 启动后端（终端1）
cd ../backend
node server.js

# 5. 启动前端（终端2）
cd ../frontend
npm run dev

# 6. 打开浏览器
open http://localhost:5173
```

---

## 配置说明

### AI模型配置

访问 `http://localhost:5173/config` 配置AI模型。

#### 方案一：Ollama本地部署（推荐，隐私性好）

```bash
# 安装Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 下载模型
ollama pull llama3.2      # 文本分析
ollama pull llava         # 图片分析

# 启动Ollama服务
ollama serve
```

配置参数：
- 提供商: `ollama`
- API地址: `http://localhost:11434`
- 主模型: `llama3.2`
- 备用模型: `llava`

#### 方案二：OpenAI API

配置参数：
- 提供商: `openai`
- API地址: `https://api.openai.com`
- API密钥: `sk-your-key-here`
- 主模型: `gpt-4`
- 备用模型: `gpt-3.5-turbo`

### Qwen3ASR配置（语音处理）

```bash
# 安装Qwen3ASR
pip install qwen3asr

# 启动Qwen3ASR服务
qwen3asr-server --port 8001
```

配置参数：
- Qwen3ASR地址: `http://localhost:8001`

---

## 使用指南

### 第一步：创建客户

在首页点击"新建客户"，填写：
- 客户名称（如：XX科技有限公司）
- 联系人（如：张经理）
- 所属行业（互联网/金融/教育...）

### 第二步：上传资料

进入客户详情页，点击附件按钮上传：
- 微信聊天截图（AI自动提取文字）
- 需求文档（PDF/TXT）
- 沟通录音（MP3/WAV/M4A）

### 第三步：AI分析

在聊天框输入：
```
帮我分析需求
```

AI会：
1. 读取所有上传的资料
2. 提取核心需求点
3. 识别隐含需求
4. 输出结构化分析报告（保存到analysis.md）

### 第四步：生成方案

输入：
```
生成方案
```

AI产出：
- 技术方案概述
- 功能模块清单
- 工时估算（按模块细分）
- 总工时和预估周期
- 技术风险提醒

保存到solution.md，直接发给客户！

### 第五步：跟进管理

通过对话更新状态：
```
状态改成已报价
```

或者在详情页点击"状态"按钮快速切换。

---

## 语音处理

### 支持格式

- MP3
- WAV
- M4A（iPhone录音）
- FLAC
- OGG

### 提取内容

1. **完整转录**：语音转文字全文
2. **说话人分离**：区分客户和我的发言
3. **问答对提取**：客户提问、我的回答
4. **需求提炼**：自动识别：
   - 功能需求
   - 工期需求
   - 预算需求
   - 技术需求

### 输出示例

```json
{
  "duration": 180,
  "speakers": ["客户", "我"],
  "qaPairs": [
    {
      "question": "大概需要多久？",
      "answer": "一个月左右",
      "type": "timeline"
    }
  ],
  "needs": [
    {
      "type": "功能需求",
      "description": "电商平台含支付功能",
      "priority": "high"
    }
  ]
}
```

### 分析报告内容

上传音频后自动生成：
- **audio_analysis.json**：结构化数据
- **audio_analysis.md**：Markdown格式报告

报告包含：
- 音频时长、说话人数量
- 提取的需求要点列表
- 问答对记录（带时间戳）
- 完整转录文本
- 说话人时间线

---

## API接口

### 客户管理

| 方法 | 接口 | 说明 |
|------|------|------|
| GET | `/api/customers` | 获取客户列表 |
| POST | `/api/customers` | 创建客户 |
| GET | `/api/customers/:id` | 获取客户详情 |
| PUT | `/api/customers/:id` | 更新客户 |
| PUT | `/api/customers/:id/status` | 更新状态 |
| DELETE | `/api/customers/:id` | 删除客户 |

### 消息对话

| 方法 | 接口 | 说明 |
|------|------|------|
| GET | `/api/customers/:id/messages` | 获取对话历史 |
| POST | `/api/customers/:id/messages` | 发送消息 |

### 文件上传

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/upload/:customerId` | 上传文件 |
| POST | `/api/audio/:customerId/upload` | 上传音频 |
| GET | `/api/audio/:customerId/analysis` | 获取音频分析 |

### AI分析

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/analysis/:id/analyze` | 分析需求 |
| POST | `/api/analysis/:id/solution` | 生成方案 |

---

## 开发扩展

### 项目结构

```
customer-research-analyzer/
├── backend/
│   ├── models/         # 数据库模型
│   ├── routes/         # API路由
│   ├── services/       # 业务逻辑
│   │   └── audioService.js  # Qwen3ASR集成
│   └── server.js       # 入口文件
├── frontend/
│   ├── src/
│   │   ├── views/      # 页面组件
│   │   ├── api/        # API客户端
│   │   └── stores/     # 状态管理
│   └── package.json
└── data/               # 本地数据存储
    └── customers/
```

### 添加新功能

1. 后端：在 `backend/routes/` 添加路由
2. 前端：在 `frontend/src/views/` 添加页面
3. API：更新 `frontend/src/api/index.js`
4. 测试：用curl或浏览器验证

### 环境变量

```bash
# 后端 .env
PORT=8000
DATA_DIR=./data
QWEN3ASR_URL=http://localhost:8001

# 前端 .env
VITE_API_URL=http://localhost:8000
```

---

## 常见问题

### Qwen3ASR连接失败

如果Qwen3ASR服务不可用，系统会使用模拟数据进行测试。

启用真实处理：
```bash
# 安装并启动Qwen3ASR
pip install qwen3asr
qwen3asr-server --port 8001
```

### 跨域错误

确保后端CORS配置正确：
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### 数据库锁定

SQLite不支持并发写入。如果出现"database is locked"：
1. 重启后端服务
2. 检查是否有多个进程在访问数据库

---

## 开发计划

- [ ] 移动端PWA适配
- [ ] 邮件提醒（跟进到期自动通知）
- [ ] 数据看板（成交率、平均客单价...）
- [ ] 团队协作（多账号、权限管理）
- [ ] 微信机器人（直接在微信里聊）
- [ ] 合同生成（根据方案自动生成合同模板）

有想法？提Issue！
