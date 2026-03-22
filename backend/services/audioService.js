const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * 音频处理服务 - 集成Qwen3ASR 0.6B
 * 支持：语音转文字、说话人分离、需求问答提取
 */
class AudioService {
  constructor() {
    // Qwen3ASR配置
    this.config = {
      // 本地Qwen3ASR服务地址
      apiUrl: process.env.QWEN3ASR_URL || 'http://localhost:8001',
      // 模型选择 - Qwen3ASR 0.6B
      model: 'qwen3asr-0.6b',
      // 是否启用说话人分离
      speakerDiarization: true,
      // 是否启用标点预测
      punctuation: true,
      // 语言设置
      language: 'zh',
    };
  }

  /**
   * 处理音频文件
   * @param {string} audioPath - 音频文件路径
   * @param {object} options - 处理选项
   * @returns {Promise<object>} 处理结果
   */
  async processAudio(audioPath, options = {}) {
    const {
      extractQuestions = true,    // 是否提取问答
      identifySpeakers = true,    // 是否识别说话人
      summarizeNeeds = true,      // 是否总结需求
    } = options;

    try {
      // 1. 语音转文字
      const transcription = await this.transcribe(audioPath, {
        speakerDiarization: identifySpeakers,
      });

      // 2. 提取问答对
      let qaPairs = [];
      if (extractQuestions && identifySpeakers) {
        qaPairs = this.extractQAPairs(transcription.segments);
      }

      // 3. 需求提炼
      let needs = [];
      if (summarizeNeeds) {
        needs = await this.extractNeeds(transcription.text, qaPairs);
      }

      return {
        success: true,
        fullText: transcription.text,
        segments: transcription.segments,
        qaPairs,
        needs,
        duration: transcription.duration,
        speakers: transcription.speakers,
        model: 'qwen3asr-0.6b',
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 调用Qwen3ASR进行语音识别
   * @param {string} audioPath - 音频路径
   * @param {object} options - 识别选项
   * @returns {Promise<object>} 识别结果
   */
  async transcribe(audioPath, options = {}) {
    // 检查文件是否存在
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // 检查音频格式，必要时转换
    const ext = path.extname(audioPath).toLowerCase();
    const supportedFormats = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];
    
    let processedPath = audioPath;
    
    // 如果不是wav格式，先转换为wav
    if (ext !== '.wav') {
      processedPath = await this.convertToWav(audioPath);
    }

    try {
      // 调用Qwen3ASR API
      const result = await this.callQwen3ASR(processedPath, options);
      
      // 清理临时文件
      if (processedPath !== audioPath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      return result;
    } catch (error) {
      // 清理临时文件
      if (processedPath !== audioPath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }
      throw error;
    }
  }

  /**
   * 调用Qwen3ASR API
   */
  async callQwen3ASR(audioPath, options) {
    const axios = require('axios');
    const FormData = require('form-data');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioPath));
    formData.append('model', this.config.model);
    formData.append('language', this.config.language);
    
    if (options.speakerDiarization) {
      formData.append('speaker_diarization', 'true');
    }
    
    formData.append('punctuation', this.config.punctuation ? 'true' : 'false');
    
    // Qwen3ASR特定参数
    formData.append('task', 'transcribe');
    formData.append('return_timestamps', 'true');

    try {
      const response = await axios.post(
        `${this.config.apiUrl}/v1/audio/transcriptions`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 300000, // 5分钟超时
        }
      );

      return this.parseQwen3ASRResult(response.data);
    } catch (error) {
      // 如果Qwen3ASR服务不可用，使用模拟数据（开发测试用）
      if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
        console.warn('Qwen3ASR service not available, using mock data');
        return this.generateMockResult(audioPath);
      }
      throw error;
    }
  }

  /**
   * 解析Qwen3ASR返回结果
   */
  parseQwen3ASRResult(data) {
    const segments = [];
    const speakers = new Set();
    let fullText = '';

    // Qwen3ASR返回格式适配
    if (data.segments && Array.isArray(data.segments)) {
      data.segments.forEach((seg, index) => {
        const speaker = seg.speaker || `说话人${(index % 2) + 1}`;
        speakers.add(speaker);
        
        segments.push({
          speaker,
          text: seg.text,
          startTime: seg.start,
          endTime: seg.end,
        });
        
        fullText += seg.text + ' ';
      });
    } else if (data.text) {
      // 简单文本返回格式
      fullText = data.text;
      segments.push({
        speaker: '说话人1',
        text: data.text,
        startTime: 0,
        endTime: data.duration || 0,
      });
    }

    return {
      text: fullText.trim(),
      segments,
      duration: data.duration || 0,
      speakers: Array.from(speakers),
    };
  }

  /**
   * 生成模拟结果（用于测试）
   */
  generateMockResult(audioPath) {
    const mockSegments = [
      {
        speaker: '客户',
        text: '我们想做一个电商平台，主要功能是商品展示和在线支付。',
        startTime: 0,
        endTime: 5,
      },
      {
        speaker: '我',
        text: '好的，请问大概需要支持多少商品数量？',
        startTime: 6,
        endTime: 9,
      },
      {
        speaker: '客户',
        text: '初期大概500个商品左右，后面可能会扩展到几千个。',
        startTime: 10,
        endTime: 15,
      },
      {
        speaker: '客户',
        text: '还有，我们需要支持微信支付和支付宝。',
        startTime: 16,
        endTime: 20,
      },
      {
        speaker: '我',
        text: '明白了，预计工期大概一个月左右。',
        startTime: 21,
        endTime: 24,
      },
    ];

    return {
      text: mockSegments.map(s => s.text).join(' '),
      segments: mockSegments,
      duration: 30,
      speakers: ['客户', '我'],
      isMock: true,
    };
  }

  /**
   * 提取问答对
   */
  extractQAPairs(segments) {
    const qaPairs = [];
    
    // 简单的问答提取逻辑
    // 假设客户和我交替说话，客户提问/需求，我回答
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      // 如果当前是客户，下一个是我的回复，则构成问答对
      if (current.speaker === '客户' || current.speaker.includes('客户')) {
        // 判断是否是问题（包含疑问词或需求描述）
        const isQuestion = this.isQuestionOrNeed(current.text);
        
        if (isQuestion) {
          qaPairs.push({
            question: current.text,
            answer: next.text,
            questionTime: current.startTime,
            answerTime: next.startTime,
            type: this.classifyQuestion(current.text),
          });
        }
      }
    }

    return qaPairs;
  }

  /**
   * 判断是否是问题或需求
   */
  isQuestionOrNeed(text) {
    const questionPatterns = [
      /吗[?？]?$/,
      /什么/,
      /怎么/,
      /如何/,
      /多少/,
      /多久/,
      /可以吗/,
      /能不能/,
      /需要/,
      /想要/,
      /希望/,
      /能不能/,
      /支持/,
    ];
    
    return questionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * 分类问题类型
   */
  classifyQuestion(text) {
    const lowerText = text.toLowerCase();
    
    if (/价格|费用|多少钱|预算|报价/.test(text)) return 'price';
    if (/时间|工期|多久|什么时候|周期/.test(text)) return 'timeline';
    if (/功能|需求|做|实现|支持/.test(text)) return 'feature';
    if (/技术|架构|框架|语言/.test(text)) return 'technical';
    if (/维护|售后|服务|保障/.test(text)) return 'service';
    
    return 'general';
  }

  /**
   * 提取需求要点
   */
  async extractNeeds(fullText, qaPairs) {
    const needs = [];
    
    // 从问答对中提取需求
    qaPairs.forEach(qa => {
      if (qa.type === 'feature') {
        needs.push({
          type: '功能需求',
          description: qa.question,
          source: '客户提问',
          priority: 'high',
        });
      }
    });

    // 从全文提取关键需求点（关键词匹配）
    const needPatterns = [
      { pattern: /(\d+)个商品/, type: '规模需求', extract: (m) => `支持${m[1]}个商品` },
      { pattern: /支付|微信|支付宝/, type: '支付需求', extract: () => '支付功能' },
      { pattern: /后台|管理|CMS/, type: '管理需求', extract: () => '后台管理系统' },
      { pattern: /APP|小程序|H5/, type: '端需求', extract: (m, text) => {
        if (text.includes('APP')) return 'APP端';
        if (text.includes('小程序')) return '微信小程序';
        if (text.includes('H5')) return 'H5页面';
        return '多端支持';
      }},
      { pattern: /用户|会员|登录|注册/, type: '用户系统', extract: () => '用户系统' },
      { pattern: /订单|购物车|库存/, type: '交易需求', extract: () => '订单交易功能' },
    ];

    needPatterns.forEach(({ pattern, type, extract }) => {
      const match = fullText.match(pattern);
      if (match && !needs.some(n => n.type === type)) {
        needs.push({
          type,
          description: extract(match, fullText),
          source: '内容分析',
          priority: 'medium',
        });
      }
    });

    return needs;
  }

  /**
   * 转换音频格式为WAV
   */
  async convertToWav(inputPath) {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.wav');
    
    try {
      // 使用ffmpeg转换
      await execPromise(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -y`);
      return outputPath;
    } catch (error) {
      console.error('FFmpeg conversion error:', error);
      // 如果转换失败，返回原路径（让Qwen3ASR尝试处理）
      return inputPath;
    }
  }

  /**
   * 生成需求分析报告
   */
  generateReport(audioResult) {
    const report = {
      summary: {
        duration: audioResult.duration,
        speakerCount: audioResult.speakers.length,
        qaCount: audioResult.qaPairs.length,
        needCount: audioResult.needs.length,
      },
      keyPoints: audioResult.needs,
      conversation: audioResult.qaPairs,
      fullTranscript: audioResult.fullText,
    };

    return report;
  }
}

module.exports = new AudioService();