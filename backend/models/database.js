const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/database.db');
const db = new sqlite3.Database(dbPath);

// 状态定义
const CUSTOMER_STATUS = {
  NEW: 'new',                    // 新建
  CONTACTED: 'contacted',        // 已联系
  REQUIREMENTS: 'requirements',  // 需求收集中
  ANALYZED: 'analyzed',          // 已分析
  QUOTED: 'quoted',              // 已报价
  NEGOTIATING: 'negotiating',    // 谈判中
  WON: 'won',                    // 已成交
  LOST: 'lost',                  // 已流失
  PAUSED: 'paused'               // 暂停跟进
};

// 初始化表
db.serialize(() => {
  // 客户表 - 增强版
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,           -- 联系人姓名
    contact_phone TEXT,          -- 联系电话
    contact_wechat TEXT,         -- 微信号
    company TEXT,                -- 公司名称
    industry TEXT,               -- 行业
    folder_path TEXT NOT NULL,
    status TEXT DEFAULT 'new',   -- 跟进状态
    priority INTEGER DEFAULT 3,  -- 优先级 1-5
    estimated_budget TEXT,       -- 预估预算
    estimated_hours INTEGER,     -- 预估工时
    next_follow_up DATE,         -- 下次跟进时间
    notes TEXT,                  -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 对话表
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  // 跟进记录表
  db.run(`CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    type TEXT,                   -- 类型: call/meeting/email/other
    content TEXT NOT NULL,       -- 跟进内容
    result TEXT,                 -- 跟进结果
    next_action TEXT,            -- 下一步行动
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);
});

module.exports = db;
module.exports.CUSTOMER_STATUS = CUSTOMER_STATUS;
