const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const db = require('../models/database');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return {
    models: {
      primary: { provider: 'ollama', model: 'llama3.2', apiUrl: 'http://localhost:11434', apiKey: '' },
      fallback: { provider: 'ollama', model: 'llava', apiUrl: 'http://localhost:11434', apiKey: '' }
    }
  };
}

async function chatWithAI(messages, modelKey = 'primary') {
  const config = loadConfig();
  const modelConfig = config.models[modelKey] || config.models.primary;
  
  try {
    if (modelConfig.provider === 'ollama') {
      const response = await axios.post(`${modelConfig.apiUrl}/api/chat`, {
        model: modelConfig.model,
        messages,
        stream: false
      }, { timeout: 120000 });
      return response.data.message.content;
    } else {
      const response = await axios.post(`${modelConfig.apiUrl}/v1/chat/completions`, {
        model: modelConfig.model,
        messages
      }, {
        headers: { Authorization: `Bearer ${modelConfig.apiKey}` },
        timeout: 120000
      });
      return response.data.choices[0].message.content;
    }
  } catch (error) {
    if (modelKey === 'primary' && config.models.fallback) {
      console.log('Primary model failed, trying fallback...');
      return chatWithAI(messages, 'fallback');
    }
    throw error;
  }
}

async function analyzeImage(imagePath, prompt) {
  const config = loadConfig();
  const modelConfig = config.models.fallback || config.models.primary;
  
  const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  
  if (modelConfig.provider === 'ollama') {
    const response = await axios.post(`${modelConfig.apiUrl}/api/chat`, {
      model: modelConfig.model,
      messages: [{
        role: 'user',
        content: prompt,
        images: [imageBase64]
      }],
      stream: false
    }, { timeout: 120000 });
    return response.data.message.content;
  } else {
    const response = await axios.post(`${modelConfig.apiUrl}/v1/chat/completions`, {
      model: modelConfig.model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }]
    }, {
      headers: { Authorization: `Bearer ${modelConfig.apiKey}` },
      timeout: 120000
    });
    return response.data.choices[0].message.content;
  }
}

// 分析客户需求
router.post('/:customerId/analyze', async (req, res) => {
  const customerId = req.params.customerId;
  
  db.get('SELECT * FROM customers WHERE id = ?', [customerId], async (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const rawDir = path.join(customer.folder_path, 'raw');
    const contentParts = [];
    
    if (fs.existsSync(rawDir)) {
      const files = fs.readdirSync(rawDir);
      for (const file of files) {
        const filePath = path.join(rawDir, file);
        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.txt') {
          const content = fs.readFileSync(filePath, 'utf8');
          contentParts.push(`[文件: ${file}]\n${content}`);
        } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          try {
            const analysis = await analyzeImage(filePath, '请分析这张聊天截图，提取对话内容和关键信息。');
            contentParts.push(`[图片: ${file}]\n${analysis}`);
          } catch (e) {
            contentParts.push(`[图片: ${file}]\n图片分析失败: ${e.message}`);
          }
        }
      }
    }
    
    if (contentParts.length === 0) {
      return res.status(400).json({ error: 'No content to analyze' });
    }
    
    const fullContent = contentParts.join('\n\n');
    const prompt = `你是一位专业的需求分析师。请分析以下客户资料，提取关键信息：

1. 客户背景和业务场景
2. 核心需求点
3. 隐含需求
4. 优先级排序
5. 潜在风险和注意事项

资料内容：
${fullContent}

请用结构化的方式输出分析结果。`;
    
    try {
      const analysis = await chatWithAI([{ role: 'user', content: prompt }]);
      
      // 保存分析结果
      const analysisFile = path.join(customer.folder_path, 'analysis.md');
      fs.writeFileSync(analysisFile, `# 需求分析 - ${customer.name}\n\n分析时间: ${new Date().toISOString()}\n\n${analysis}`, 'utf8');
      
      res.json({ analysis, saved_to: analysisFile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// 生成解决方案
router.post('/:customerId/solution', async (req, res) => {
  const customerId = req.params.customerId;
  
  db.get('SELECT * FROM customers WHERE id = ?', [customerId], async (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const analysisFile = path.join(customer.folder_path, 'analysis.md');
    if (!fs.existsSync(analysisFile)) {
      return res.status(400).json({ error: 'Please run analysis first' });
    }
    
    const analysis = fs.readFileSync(analysisFile, 'utf8');
    const prompt = `基于以下需求分析，请推导解决方案：

需求分析：
${analysis}

请提供：
1. 技术方案概述
2. 功能模块清单
3. 工时估算（按模块细分）
4. 总工时和预估周期
5. 技术风险和注意事项

请以Markdown格式输出。`;
    
    try {
      const solution = await chatWithAI([{ role: 'user', content: prompt }]);
      
      // 保存方案
      const solutionFile = path.join(customer.folder_path, 'solution.md');
      fs.writeFileSync(solutionFile, `# 解决方案 - ${customer.name}\n\n生成时间: ${new Date().toISOString()}\n\n${solution}`, 'utf8');
      
      res.json({ solution, saved_to: solutionFile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// 获取分析文件列表
router.get('/:customerId/files', (req, res) => {
  const customerId = req.params.customerId;
  
  db.get('SELECT folder_path FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const files = [];
    if (fs.existsSync(customer.folder_path)) {
      const items = fs.readdirSync(customer.folder_path);
      for (const item of items) {
        const filePath = path.join(customer.folder_path, item);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && path.extname(item) === '.md') {
          files.push({
            name: item,
            path: filePath,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
    
    res.json(files);
  });
});

// 读取分析文件
router.get('/:customerId/files/:filename', (req, res) => {
  const customerId = req.params.customerId;
  const filename = req.params.filename;
  
  db.get('SELECT folder_path FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const filePath = path.join(customer.folder_path, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  });
});

module.exports = router;
