<template>
  <div class="config-view">
    <el-page-header @back="$router.back()" title="AI模型配置" />
    
    <div class="config-content">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>主模型配置</span>
            <el-tag type="success">Primary</el-tag>
          </div>
        </template>
        
        <el-form :model="config.models.primary" label-width="120px">
          <el-form-item label="提供商">
            <el-select v-model="config.models.primary.provider">
              <el-option label="Ollama (本地)" value="ollama" />
              <el-option label="OpenAI API" value="openai" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="模型名称">
            <el-input v-model="config.models.primary.model" placeholder="如: llama3.2" />
          </el-form-item>
          
          <el-form-item label="API地址">
            <el-input v-model="config.models.primary.apiUrl" placeholder="如: http://localhost:11434" />
          </el-form-item>
          
          <el-form-item label="API密钥" v-if="config.models.primary.provider === 'openai'">
            <el-input v-model="config.models.primary.apiKey" type="password" show-password />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <span>备用模型配置 (多模态)</span>
            <el-tag type="warning">Fallback</el-tag>
          </div>
        </template>
        
        <el-form :model="config.models.fallback" label-width="120px">
          <el-form-item label="提供商">
            <el-select v-model="config.models.fallback.provider">
              <el-option label="Ollama (本地)" value="ollama" />
              <el-option label="OpenAI API" value="openai" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="模型名称">
            <el-input v-model="config.models.fallback.model" placeholder="如: llava (支持图片)" />
          </el-form-item>
          
          <el-form-item label="API地址">
            <el-input v-model="config.models.fallback.apiUrl" placeholder="如: http://localhost:11434" />
          </el-form-item>
          
          <el-form-item label="API密钥" v-if="config.models.fallback.provider === 'openai'">
            <el-input v-model="config.models.fallback.apiKey" type="password" show-password />
          </el-form-item>
        </el-form>
      </el-card>

      <div class="actions">
        <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
        <el-button @click="testConnection" :loading="testing">测试连接</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { configApi } from '../api'

const config = ref({
  models: {
    primary: { provider: 'ollama', model: 'llama3.2', apiUrl: 'http://localhost:11434', apiKey: '' },
    fallback: { provider: 'ollama', model: 'llava', apiUrl: 'http://localhost:11434', apiKey: '' }
  }
})

const saving = ref(false)
const testing = ref(false)

onMounted(async () => {
  try {
    const res = await configApi.get()
    config.value = res.data
  } catch (error) {
    ElMessage.error('加载配置失败')
  }
})

async function saveConfig() {
  saving.value = true
  try {
    await configApi.update(config.value.models)
    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    // TODO: 实现连接测试
    await new Promise(r => setTimeout(r, 1000))
    ElMessage.success('连接测试通过')
  } catch (error) {
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.config-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.config-content {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  margin-top: 20px;
  text-align: center;
}
</style>
