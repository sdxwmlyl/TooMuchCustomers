const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const defaultConfig = {
  models: {
    primary: {
      provider: 'ollama',
      model: 'llama3.2',
      apiUrl: 'http://localhost:11434',
      apiKey: ''
    },
    fallback: {
      provider: 'ollama',
      model: 'llava',
      apiUrl: 'http://localhost:11434',
      apiKey: ''
    }
  }
};

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return defaultConfig;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// 获取配置
router.get('/', (req, res) => {
  res.json(loadConfig());
});

// 更新配置
router.put('/', (req, res) => {
  const config = loadConfig();
  config.models = req.body.models || config.models;
  saveConfig(config);
  res.json({ message: 'Config updated' });
});

module.exports = router;
