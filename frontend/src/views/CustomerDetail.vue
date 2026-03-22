<template>
  <div class="customer-detail">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <el-button link @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <el-divider direction="vertical" />
        <h2>{{ customer.name }}</h2>
        <el-tag :color="customer.statusColor" effect="dark" size="small" style="margin-left: 12px">
          {{ customer.statusLabel }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button @click="showInfoDrawer = true">
          <el-icon><InfoFilled /></el-icon> 详情
        </el-button>
        <el-button @click="$router.push('/config')">
          <el-icon><Setting /></el-icon> 配置
        </el-button>
      </div>
    </header>

    <div class="main-content">
      <!-- 左侧客户信息概览 -->
      <aside class="info-sidebar">
        <el-card>
          <template #header>
            <span>基本信息</span>
          </template>
          <div class="info-list">
            <div class="info-item">
              <label>联系人</label>
              <span>{{ customer.contact_name || '-' }}</span>
            </div>
            <div class="info-item">
              <label>公司</label>
              <span>{{ customer.company || '-' }}</span>
            </div>
            <div class="info-item">
              <label>行业</label>
              <span>{{ customer.industry || '-' }}</span>
            </div>
            <div class="info-item">
              <label>预估预算</label>
              <span>{{ customer.estimated_budget || '-' }}</span>
            </div>
            <div class="info-item">
              <label>预估工时</label>
              <span>{{ customer.estimated_hours ? customer.estimated_hours + 'h' : '-' }}</span>
            </div>
            <div class="info-item">
              <label>优先级</label>
              <el-rate v-model="customer.priority" disabled show-score />
            </div>
          </div>
        </el-card>

        <el-card style="margin-top: 16px">
          <template #header>
            <span>文档</span>
          </template>
          <div class="file-list">
            <div v-if="analysisFiles.length === 0" class="empty-files">
              暂无分析文档
            </div>
            <div
              v-for="file in analysisFiles"
              :key="file.name"
              class="file-item"
              @click="viewFile(file)"
            >
              <el-icon><Document /></el-icon>
              <span class="file-name">{{ file.name }}</span>
            </div>
          </div>
        </el-card>
      </aside>

      <!-- 右侧AI对话区域 -->
      <main class="chat-area">
        <div class="messages" ref="messagesRef">
          <div class="welcome-message">
            <el-alert
              title="AI助手已就绪"
              description="你可以通过对话完成：上传资料、分析需求、生成方案、调整工时、更新状态等操作"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
          
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <el-avatar v-if="msg.role === 'assistant'" :icon="Service" />
              <el-avatar v-else :icon="User" />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span>{{ msg.role === 'assistant' ? 'AI助手' : '我' }}</span>
                <span class="time">{{ formatTime(msg.created_at) }}</span>
              </div>
              <div class="message-body" v-html="formatMessage(msg.content)"></div>
              <div v-if="msg.attachments?.length" class="message-attachments">
                <el-tag
                  v-for="att in msg.attachments"
                  :key="att"
                  size="small"
                  type="info"
                >
                  <el-icon><Paperclip /></el-icon> {{ att }}
                </el-tag>
              </div>
            </div>
          </div>

          <div v-if="loading" class="message assistant">
            <div class="message-avatar">
              <el-avatar :icon="Service" />
            </div>
            <div class="message-content">
              <el-skeleton :rows="2" animated />
            </div>
          </div>
        </div>

        <div class="input-area">
          <div class="input-toolbar">
            <el-upload
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleFileSelect"
              accept=".txt,.pdf,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.flac,.ogg"
            >
              <el-button link>
                <el-icon><Paperclip /></el-icon> 附件
              </el-button>
            </el-upload>
            <el-button link @click="quickAction('分析需求')">
              <el-icon><DataAnalysis /></el-icon> 分析
            </el-button>
            <el-button link @click="quickAction('生成方案')">
              <el-icon><Document /></el-icon> 方案
            </el-button>
            <el-button link @click="showStatusDialog = true">
              <el-icon><Refresh /></el-icon> 状态
            </el-button>
          </div>
          
          <div class="input-box">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="输入消息，或点击上方快捷操作..."
              @keydown.enter.prevent="sendMessage"
            />
            <el-button 
              type="primary" 
              :disabled="!inputMessage.trim() && !selectedFile"
              @click="sendMessage"
            >
              发送
            </el-button>
          </div>
          
          <div v-if="selectedFile" class="selected-file">
            <el-tag closable @close="selectedFile = null">
              <el-icon><Document /></el-icon> {{ selectedFile.name }}
            </el-tag>
          </div>
        </div>
      </main>
    </div>

    <!-- 客户详情抽屉 -->
    <el-drawer v-model="showInfoDrawer" title="客户详情" size="400px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="客户ID">{{ customer.id }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ customer.name }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ customer.contact_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ customer.contact_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="微信号">{{ customer.contact_wechat || '-' }}</el-descriptions-item>
        <el-descriptions-item label="公司名称">{{ customer.company || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属行业">{{ customer.industry || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :color="customer.statusColor" effect="dark">
            {{ customer.statusLabel }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="预估预算">{{ customer.estimated_budget || '-' }}</el-descriptions-item>
        <el-descriptions-item label="预估工时">{{ customer.estimated_hours ? customer.estimated_hours + 'h' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="优先级">
          <el-rate v-model="customer.priority" disabled />
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ customer.notes || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(customer.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(customer.updated_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <!-- 状态更新对话框 -->
    <el-dialog v-model="showStatusDialog" title="更新客户状态" width="400px">
      <p>当前状态：<el-tag :color="customer.statusColor" effect="dark">{{ customer.statusLabel }}</el-tag></p>
      <div style="margin-top: 16px">
        <p>可选状态：</p>
        <div class="status-options">
          <el-button
            v-for="s in availableStatuses"
            :key="s.value"
            :type="customer.status === s.value ? 'primary' : 'default'"
            size="small"
            @click="updateStatus(s.value)"
          >
            {{ s.label }}
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 查看文档对话框 -->
    <el-dialog v-model="showFileDialog" title="文档内容" width="70%">
      <pre class="file-content">{{ currentFileContent }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { customerApi, uploadApi, analysisApi, audioApi } from '../api'

const route = useRoute()
const customerId = route.params.id

const customer = ref({})
const messages = ref([])
const analysisFiles = ref([])
const inputMessage = ref('')
const selectedFile = ref(null)
const loading = ref(false)
const messagesRef = ref(null)

const showInfoDrawer = ref(false)
const showStatusDialog = ref(false)
const showFileDialog = ref(false)
const currentFileContent = ref('')

const STATUS_OPTIONS = [
  { value: 'new', label: '新建', color: '#909399' },
  { value: 'contacted', label: '已联系', color: '#409eff' },
  { value: 'requirements', label: '需求收集', color: '#67c23a' },
  { value: 'analyzed', label: '已分析', color: '#67c23a' },
  { value: 'quoted', label: '已报价', color: '#e6a23c' },
  { value: 'negotiating', label: '谈判中', color: '#e6a23c' },
  { value: 'won', label: '已成交', color: '#67c23a' },
  { value: 'lost', label: '已流失', color: '#f56c6c' },
  { value: 'paused', label: '暂停', color: '#909399' }
]

const availableStatuses = ref([])

onMounted(() => {
  fetchCustomer()
  fetchMessages()
  fetchFiles()
})

async function fetchCustomer() {
  try {
    const res = await customerApi.get(customerId)
    customer.value = res.data
    // 计算可用状态
    const available = res.data.availableTransitions || []
    availableStatuses.value = STATUS_OPTIONS.filter(s => 
      available.includes(s.value) || s.value === customer.value.status
    )
  } catch (error) {
    ElMessage.error('获取客户信息失败')
  }
}

async function fetchMessages() {
  try {
    const res = await customerApi.getMessages(customerId)
    messages.value = res.data
    scrollToBottom()
  } catch (error) {
    console.error('获取消息失败', error)
  }
}

async function fetchFiles() {
  try {
    const res = await analysisApi.getFiles(customerId)
    analysisFiles.value = res.data
  } catch (error) {
    console.error('获取文件失败', error)
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim() && !selectedFile.value) return
  
  // 如果有文件，先上传
  if (selectedFile.value) {
    try {
      const file = selectedFile.value.raw
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|flac|ogg)$/i.test(file.name)
      
      if (isAudio) {
        // 音频文件 - 调用音频分析API
        ElMessage.info('正在分析音频，请稍候...')
        const res = await audioApi.upload(customerId, file)
        await customerApi.sendMessage(customerId, `[上传音频: ${selectedFile.value.name}]\n识别出${res.data.qaPairs.length}个问答对，${res.data.needs.length}个需求点`, 'user')
        // 添加AI分析结果
        await customerApi.sendMessage(customerId, `音频分析完成！\n\n提取的需求要点：\n${res.data.needs.map((n, i) => `${i+1}. ${n.type}: ${n.description}`).join('\n')}`, 'assistant')
        await fetchFiles()
      } else {
        // 普通文件
        await uploadApi.upload(customerId, file)
        await customerApi.sendMessage(customerId, `[上传文件: ${selectedFile.value.name}]`, 'user')
      }
      selectedFile.value = null
    } catch (error) {
      ElMessage.error('上传失败: ' + error.message)
      return
    }
  }
  
  // 发送消息
  if (inputMessage.value.trim()) {
    const content = inputMessage.value
    await customerApi.sendMessage(customerId, content, 'user')
    inputMessage.value = ''
    await fetchMessages()
    
    // 调用AI处理
    await processAIRequest(content)
  }
}

async function processAIRequest(content) {
  loading.value = true
  
  try {
    // 简单的关键词匹配
    if (content.includes('分析') || content.includes('需求')) {
      const res = await analysisApi.analyze(customerId)
      await customerApi.sendMessage(customerId, res.data.analysis, 'assistant')
      await fetchFiles()
    } else if (content.includes('方案') || content.includes('报价')) {
      const res = await analysisApi.generateSolution(customerId)
      await customerApi.sendMessage(customerId, '已生成解决方案，请查看文档。', 'assistant')
      await fetchFiles()
    } else {
      // 通用回复
      await customerApi.sendMessage(
        customerId, 
        '收到，我会帮你记录这个信息。你可以说"分析需求"或"生成方案"来让我帮你处理。', 
        'assistant'
      )
    }
  } catch (error) {
    await customerApi.sendMessage(
      customerId,
      '抱歉，处理时出错了：' + error.message,
      'assistant'
    )
  } finally {
    loading.value = false
    await fetchMessages()
    scrollToBottom()
  }
}

function handleFileSelect(file) {
  selectedFile.value = file
}

function quickAction(action) {
  inputMessage.value = action
  sendMessage()
}

async function updateStatus(status) {
  try {
    await customerApi.updateStatus(customerId, status)
    ElMessage.success('状态更新成功')
    showStatusDialog.value = false
    fetchCustomer()
  } catch (error) {
    ElMessage.error('更新失败: ' + error.message)
  }
}

async function viewFile(file) {
  const res = await analysisApi.getFile(customerId, file.name)
  currentFileContent.value = res.data.content
  showFileDialog.value = true
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

function formatMessage(content) {
  // 简单的Markdown格式
  return content
    .replace(/\n/g, '<br>')
    .replace(/#{1,6}\s(.+)/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}
</script>

<style scoped>
.customer-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.info-sidebar {
  width: 300px;
  background: #f5f7fa;
  padding: 16px;
  overflow-y: auto;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item label {
  color: #909399;
  font-size: 13px;
}

.info-item span {
  color: #303133;
  font-size: 14px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-files {
  color: #909399;
  text-align: center;
  padding: 20px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-item:hover {
  background: #ecf5ff;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.welcome-message {
  margin-bottom: 24px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #909399;
}

.message.user .message-header {
  justify-content: flex-end;
}

.message-header .time {
  color: #c0c4cc;
}

.message-body {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  color: #303133;
}

.message.user .message-body {
  background: #409eff;
  color: #fff;
}

.message-attachments {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.input-area {
  border-top: 1px solid #e4e7ed;
  padding: 16px 24px;
  background: #fff;
}

.input-toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.input-box {
  display: flex;
  gap: 12px;
}

.input-box .el-textarea {
  flex: 1;
}

.selected-file {
  margin-top: 8px;
}

.status-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.file-content {
  max-height: 60vh;
  overflow: auto;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  white-space: pre-wrap;
  font-family: monospace;
  line-height: 1.6;
}
</style>