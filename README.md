# 客户需求调研分析系统

本地部署的AI驱动客户需求分析工具。

## 功能
- 客户管理与搜索
- 聊天记录上传与分析
- AI需求自动分析
- 方案推导与工时估算
- 对话式需求补充

## 快速开始

### 后端启动
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

## 配置
访问 http://localhost:5173/config 配置AI模型
