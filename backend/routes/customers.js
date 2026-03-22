const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

const DATA_DIR = path.join(__dirname, '../../data');

// 状态流转规则
const STATUS_FLOW = {
  'new': ['contacted', 'paused', 'lost'],
  'contacted': ['requirements', 'paused', 'lost'],
  'requirements': ['analyzed', 'paused', 'lost'],
  'analyzed': ['quoted', 'requirements', 'paused', 'lost'],
  'quoted': ['negotiating', 'won', 'lost'],
  'negotiating': ['won', 'quoted', 'lost'],
  'won': [],
  'lost': ['new'],
  'paused': ['new', 'contacted', 'requirements']
};

const STATUS_LABELS = {
  'new': '新建',
  'contacted': '已联系',
  'requirements': '需求收集中',
  'analyzed': '已分析',
  'quoted': '已报价',
  'negotiating': '谈判中',
  'won': '已成交',
  'lost': '已流失',
  'paused': '暂停跟进'
};

const STATUS_COLORS = {
  'new': '#909399',
  'contacted': '#409eff',
  'requirements': '#67c23a',
  'analyzed': '#67c23a',
  'quoted': '#e6a23c',
  'negotiating': '#e6a23c',
  'won': '#67c23a',
  'lost': '#f56c6c',
  'paused': '#909399'
};

// 获取客户列表（支持筛选和排序）
router.get('/', (req, res) => {
  const { q, status, sortBy = 'updated_at', order = 'desc' } = req.query;
  
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  
  if (q) {
    sql += ' AND (name LIKE ? OR contact_name LIKE ? OR company LIKE ?)';
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ);
  }
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ` ORDER BY ${sortBy} ${order.toUpperCase()}`;
  
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({
      ...row,
      statusLabel: STATUS_LABELS[row.status],
      statusColor: STATUS_COLORS[row.status]
    })));
  });
});

// 获取客户统计
router.get('/stats', (req, res) => {
  db.all(`
    SELECT status, COUNT(*) as count 
    FROM customers 
    GROUP BY status
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const stats = {
      total: 0,
      active: 0,
      won: 0,
      lost: 0,
      byStatus: {}
    };
    
    rows.forEach(row => {
      stats.total += row.count;
      stats.byStatus[row.status] = row.count;
      if (['new', 'contacted', 'requirements', 'analyzed', 'quoted', 'negotiating'].includes(row.status)) {
        stats.active += row.count;
      }
      if (row.status === 'won') stats.won = row.count;
      if (row.status === 'lost') stats.lost = row.count;
    });
    
    res.json(stats);
  });
});

// 创建客户
router.post('/', (req, res) => {
  const { 
    name, 
    contact_name = '', 
    contact_phone = '', 
    contact_wechat = '',
    company = '',
    industry = '',
    notes = ''
  } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const folderName = `${name}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
  const folderPath = path.join(DATA_DIR, 'customers', folderName);
  
  // 创建文件夹结构
  fs.mkdirSync(folderPath, { recursive: true });
  fs.mkdirSync(path.join(folderPath, 'raw'), { recursive: true });
  fs.mkdirSync(path.join(folderPath, 'followups'), { recursive: true });
  
  // 创建客户记录
  db.run(
    `INSERT INTO customers (
      id, name, contact_name, contact_phone, contact_wechat, 
      company, industry, folder_path, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    [id, name, contact_name, contact_phone, contact_wechat, company, industry, folderPath, notes],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ 
        id, name, contact_name, contact_phone, contact_wechat,
        company, industry, folder_path: folderPath, 
        status: 'new', statusLabel: '新建', statusColor: '#909399'
      });
    }
  );
});

// 获取客户详情
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json({
      ...row,
      statusLabel: STATUS_LABELS[row.status],
      statusColor: STATUS_COLORS[row.status],
      availableTransitions: STATUS_FLOW[row.status] || []
    });
  });
});

// 更新客户信息
router.put('/:id', (req, res) => {
  const { 
    name, contact_name, contact_phone, contact_wechat,
    company, industry, status, priority, estimated_budget,
    estimated_hours, next_follow_up, notes
  } = req.body;
  
  const updates = [];
  const params = [];
  
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (contact_name !== undefined) { updates.push('contact_name = ?'); params.push(contact_name); }
  if (contact_phone !== undefined) { updates.push('contact_phone = ?'); params.push(contact_phone); }
  if (contact_wechat !== undefined) { updates.push('contact_wechat = ?'); params.push(contact_wechat); }
  if (company !== undefined) { updates.push('company = ?'); params.push(company); }
  if (industry !== undefined) { updates.push('industry = ?'); params.push(industry); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
  if (estimated_budget !== undefined) { updates.push('estimated_budget = ?'); params.push(estimated_budget); }
  if (estimated_hours !== undefined) { updates.push('estimated_hours = ?'); params.push(estimated_hours); }
  if (next_follow_up !== undefined) { updates.push('next_follow_up = ?'); params.push(next_follow_up); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  
  db.run(
    `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
    params,
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Customer updated' });
    }
  );
});

// 更新客户状态
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const customerId = req.params.id;
  
  if (!status || !STATUS_LABELS[status]) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  db.get('SELECT status FROM customers WHERE id = ?', [customerId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    
    // 检查状态流转是否合法
    const allowedTransitions = STATUS_FLOW[row.status] || [];
    if (!allowedTransitions.includes(status) && row.status !== status) {
      return res.status(400).json({ 
        error: `Cannot transition from ${row.status} to ${status}`,
        availableTransitions: allowedTransitions
      });
    }
    
    db.run(
      'UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, customerId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          message: 'Status updated',
          status,
          statusLabel: STATUS_LABELS[status],
          statusColor: STATUS_COLORS[status]
        });
      }
    );
  });
});

// 删除客户
router.delete('/:id', (req, res) => {
  db.get('SELECT folder_path FROM customers WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    
    // 删除文件夹
    if (fs.existsSync(row.folder_path)) {
      fs.rmSync(row.folder_path, { recursive: true });
    }
    
    // 删除数据库记录
    db.run('DELETE FROM customers WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Customer deleted' });
    });
  });
});

// 获取客户消息
router.get('/:id/messages', (req, res) => {
  db.all(
    'SELECT * FROM conversations WHERE customer_id = ? ORDER BY created_at ASC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({
        ...r,
        attachments: r.attachments ? JSON.parse(r.attachments) : []
      })));
    }
  );
});

// 创建消息
router.post('/:id/messages', (req, res) => {
  const { content, role = 'user' } = req.body;
  const customerId = req.params.id;
  
  db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    
    const id = uuidv4();
    db.run(
      'INSERT INTO conversations (id, customer_id, role, content) VALUES (?, ?, ?, ?)',
      [id, customerId, role, content],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // 更新客户更新时间
        db.run('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [customerId]);
        
        res.json({ id, customer_id: customerId, role, content });
      }
    );
  });
});

// 获取跟进记录
router.get('/:id/followups', (req, res) => {
  db.all(
    'SELECT * FROM followups WHERE customer_id = ? ORDER BY created_at DESC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 创建跟进记录
router.post('/:id/followups', (req, res) => {
  const { type, content, result, next_action } = req.body;
  const customerId = req.params.id;
  
  const id = uuidv4();
  db.run(
    'INSERT INTO followups (id, customer_id, type, content, result, next_action) VALUES (?, ?, ?, ?, ?, ?)',
    [id, customerId, type, content, result, next_action],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // 更新客户更新时间
      db.run('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [customerId]);
      
      res.json({ id, customer_id: customerId, type, content, result, next_action });
    }
  );
});

module.exports = router;