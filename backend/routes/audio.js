const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/database');
const audioService = require('../services/audioService');

const DATA_DIR = path.join(__dirname, '../../data');

// 配置音频上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const customerId = req.params.customerId;
    db.get('SELECT folder_path FROM customers WHERE id = ?', [customerId], (err, row) => {
      if (err || !row) return cb(new Error('Customer not found'));
      const uploadDir = path.join(row.folder_path, 'raw');
      cb(null, uploadDir);
    });
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = path.extname(file.originalname);
    cb(null, `recording_${timestamp}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
      'audio/mp4', 'audio/m4a', 'audio/flac', 'audio/ogg'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|flac|ogg)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format. Supported: mp3, wav, m4a, flac, ogg'));
    }
  }
});

/**
 * 上传并处理音频文件
 * POST /api/audio/:customerId/upload
 */
router.post('/:customerId/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const customerId = req.params.customerId;
  
  db.get('SELECT * FROM customers WHERE id = ?', [customerId], async (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    try {
      // 处理音频
      const result = await audioService.processAudio(req.file.path, {
        extractQuestions: true,
        identifySpeakers: true,
        summarizeNeeds: true,
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // 保存分析结果
      const reportPath = path.join(customer.folder_path, 'audio_analysis.json');
      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf8');

      // 生成Markdown报告
      const markdownReport = generateMarkdownReport(customer.name, result);
      const markdownPath = path.join(customer.folder_path, 'audio_analysis.md');
      fs.writeFileSync(markdownPath, markdownReport, 'utf8');

      // 保存到数据库
      const conversationId = require('uuid').v4();
      db.run(
        `INSERT INTO conversations (id, customer_id, role, content, attachments) VALUES (?, ?, ?, ?, ?)`,
        [
          conversationId,
          customerId,
          'system',
          `语音分析完成：识别出${result.qaPairs.length}个问答对，${result.needs.length}个需求点`,
          JSON.stringify([{
            type: 'audio',
            filename: req.file.filename,
            path: req.file.path,
            duration: result.duration,
            report: 'audio_analysis.md'
          }])
        ]
      );

      res.json({
        success: true,
        message: 'Audio processed successfully',
        filename: req.file.filename,
        duration: result.duration,
        speakers: result.speakers,
        qaPairs: result.qaPairs,
        needs: result.needs,
        reports: {
          json: reportPath,
          markdown: markdownPath
        }
      });
    } catch (error) {
      console.error('Audio processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * 获取音频分析结果
 * GET /api/audio/:customerId/analysis
 */
router.get('/:customerId/analysis', (req, res) => {
  const customerId = req.params.customerId;
  
  db.get('SELECT folder_path FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const reportPath = path.join(customer.folder_path, 'audio_analysis.json');
    
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ error: 'No audio analysis found' });
    }

    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read analysis report' });
    }
  });
});

/**
 * 获取音频分析Markdown报告
 * GET /api/audio/:customerId/report
 */
router.get('/:customerId/report', (req, res) => {
  const customerId = req.params.customerId;
  
  db.get('SELECT folder_path FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const reportPath = path.join(customer.folder_path, 'audio_analysis.md');
    
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ error: 'No report found' });
    }

    const content = fs.readFileSync(reportPath, 'utf8');
    res.json({ content });
  });
});

/**
 * 生成Markdown格式报告
 */
function generateMarkdownReport(customerName, result) {
  const date = new Date().toLocaleString('zh-CN');
  
  let md = `# 语音沟通分析报告 - ${customerName}

> 分析时间：${date}  
> 音频时长：${formatDuration(result.duration)}  
> 说话人：${result.speakers.join('、')}

---

## 📊 分析概览

| 指标 | 数值 |
|------|------|
| 音频时长 | ${formatDuration(result.duration)} |
| 说话人数量 | ${result.speakers.length} 人 |
| 问答对 | ${result.qaPairs.length} 个 |
| 需求要点 | ${result.needs.length} 个 |

---

## 🎯 提取的需求要点

`;

  if (result.needs.length > 0) {
    result.needs.forEach((need, index) => {
      md += `### ${index + 1}. ${need.type}

**描述**：${need.description}  
**来源**：${need.source}  
**优先级**：${need.priority === 'high' ? '🔴 高' : need.priority === 'medium' ? '🟡 中' : '🟢 低'}

`;
    });
  } else {
    md += '*未识别到明确需求点*\n\n';
  }

  md += `---

## 💬 关键问答记录

`;

  if (result.qaPairs.length > 0) {
    result.qaPairs.forEach((qa, index) => {
      const typeLabel = {
        'price': '💰 价格',
        'timeline': '⏱️ 工期',
        'feature': '✨ 功能',
        'technical': '🔧 技术',
        'service': '🛠️ 服务',
        'general': '📝 一般'
      }[qa.type] || '📝 一般';
      
      md += `### 问答 ${index + 1} [${typeLabel}]

**时间**：${formatTime(qa.questionTime)} - ${formatTime(qa.answerTime)}

**问**：${qa.question}

**答**：${qa.answer}

---

`;
    });
  } else {
    md += '*未识别到问答对*\n\n';
  }

  md += `
## 📝 完整转录文本

<details>
<summary>点击查看完整文本</summary>

${result.fullText}

</details>

---

## 🎵 说话人时间线

`;

  if (result.segments && result.segments.length > 0) {
    result.segments.forEach(seg => {
      md += `- **${seg.speaker}** (${formatTime(seg.startTime)}-${formatTime(seg.endTime)})：${seg.text}\n`;
    });
  }

  md += `
---

*本报告由AI自动生成，仅供参考*
`;

  return md;
}

/**
 * 格式化时长
 */
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化时间
 */
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = router;
