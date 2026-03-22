<template>
  <div class="main-layout">
    <!-- 左侧客户列表 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>客户列表</h2>
        <el-button type="primary" size="small" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
      
      <el-input
        v-model="customerStore.searchQuery"
        placeholder="搜索客户..."
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      
      <div class="customer-list">
        <div
          v-for="customer in customerStore.filteredCustomers"
          :key="customer.id"
          :class="['customer-item', { active: customerStore.currentCustomer?.id === customer.id }]"
          @click="selectCustomer(customer)"
        >
          <el-icon><User /></el-icon>
          <span class="customer-name">{{ customer.name }}</span>
          <el-icon class="delete-btn" @click.stop="deleteCustomer(customer.id)"><Delete /></el-icon>
        </div>
      </div>
    </aside>

    <!-- 右侧主区域 -->
    <main class="main-content">
      <template v-if="customerStore.currentCustomer">
        <!-- 顶部工具栏 -->
        <div class="toolbar">
          <h3>{{ customerStore.currentCustomer.name }}</h3>
          <div class="toolbar-actions">
            <el-button size="small" @click="showUploadDialog = true">
              <el-icon><Upload /></el-icon> 上传资料
            </el-button>
            <el-button size="small" type="primary" @click="analyzeCustomer" :loading="customerStore.loading">
              <el-icon><DataAnalysis /></el-icon> 分析需求
            </el-button>
            <el-button size="small" type="success" @click="generateSolution" :loading="customerStore.loading">
              <el-icon><Document /></el-icon> 生成方案
            </el-button>
            <el-button size="small" @click="showFilesDrawer = true">
              <el-icon><Folder /></el-icon> 文档
            </el-button>
          </div>
        </div>

        <!-- 对话区域 -->
        <div class="chat-area" ref="chatArea">
          <div
            v-for="msg in customerStore.messages"
            :key="msg.id"
            :class="['message', msg.role]"
          >
            <div class="message-content">
              <div class="message-header">
                <el-icon v-if="msg.role === 'user'"><User /></el-icon>
                <el-icon v-else><Service /></el-icon>
                <span>{{ msg.role === 'user' ? '我' : 'AI助手' }}</span>
                <span class="time">{{ formatTime(msg.created_at) }}</span>
              </div>
              <div class="message-body">{{ msg.content }}</div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <el-input
            v-model="messageInput"
            type="textarea"
            :rows="3"
            placeholder="输入消息..."
            @keydown.enter.prevent="sendMessage"
          />
          <el-button type="primary" @click="sendMessage" :disabled="!messageInput.trim()">
            发送
          </el-button>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-icon :size="64" color="#ccc"><User /></el-icon>
        <p>请选择或创建一个客户开始</p>
      </div>
    </main>

    <!-- 添加客户对话框 -->
    <el-dialog v-model="showAddDialog" title="新建客户" width="400px">
      <el-input v-model="newCustomerName" placeholder="客户名称" />
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="createCustomer" :disabled="!newCustomerName.trim()">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 上传对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传资料" width="500px">
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        accept=".txt,.pdf,.png,.jpg,.jpeg"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 txt, pdf, png, jpg 格式
          </div>
        </template>
      </el-upload>
    </el-dialog>

    <!-- 文档抽屉 -->
    <el-drawer v-model="showFilesDrawer" title="分析文档" size="50%">
      <div class="files-list">
        <el-card v-for="file in customerStore.analysisFiles" :key="file.name" class="file-card">
          <template #header>
            <div class="file-header">
              <span>{{ file.name }}</span>
              <el-button size="small" @click="viewFile(file)">查看</el-button>
            </div>
          </template>
          <div class="file-info">
            <p>大小: {{ formatSize(file.size) }}</p>
            <p>修改: {{ formatTime(file.modified) }}</p>
          </div>
        </el-card>
      </div>
    </el-drawer>

    <!-- 查看文档对话框 -->
    <el-dialog v-model="showFileDialog" title="文档内容" width="70%">
      <pre class="file-content">{{ currentFileContent }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useCustomerStore } from '../stores/customer'
import { ElMessage, ElMessageBox } from 'element-plus'
import { analysisApi } from '../api'

const customerStore = useCustomerStore()
const chatArea = ref(null)
const messageInput = ref('')
const newCustomerName = ref('')
const showAddDialog = ref(false)
const showUploadDialog = ref(false)
const showFilesDrawer = ref(false)
const showFileDialog = ref(false)
const currentFileContent = ref('')

// 初始化加载客户列表
customerStore.fetchCustomers()

async function selectCustomer(customer) {
  await customerStore.selectCustomer(customer)
  scrollToBottom()
}

async function createCustomer() {
  await customerStore.createCustomer(newCustomerName.value)
  newCustomerName.value = ''
  showAddDialog.value = false
  ElMessage.success('客户创建成功')
}

async function deleteCustomer(id) {
  try {
    await ElMessageBox.confirm('确定删除该客户？', '提示', { type: 'warning' })
    await customerStore.deleteCustomer(id)
    ElMessage.success('删除成功')
  } catch {
    // 取消删除
  }
}

async function sendMessage() {
  if (!messageInput.value.trim()) return
  
  await customerStore.sendMessage(messageInput.value)
  messageInput.value = ''
  scrollToBottom()
  
  // TODO: 调用AI回复
}

async function handleFileChange(file) {
  try {
    await customerStore.uploadFile(file.raw)
    ElMessage.success('上传成功')
    showUploadDialog.value = false
  } catch (error) {
    ElMessage.error('上传失败: ' + error.message)
  }
}

async function analyzeCustomer() {
  try {
    const result = await customerStore.analyzeCustomer()
    ElMessage.success('分析完成')
    // 添加AI分析结果到对话
    await customerStore.sendMessage(result.analysis, 'assistant')
    scrollToBottom()
  } catch (error) {
    ElMessage.error('分析失败: ' + error.message)
  }
}

async function generateSolution() {
  try {
    const result = await customerStore.generateSolution()
    ElMessage.success('方案生成完成')
    // 添加方案到对话
    await customerStore.sendMessage('已生成解决方案，请查看文档。', 'assistant')
    scrollToBottom()
  } catch (error) {
    ElMessage.error('生成失败: ' + error.message)
  }
}

async function viewFile(file) {
  const res = await analysisApi.getFile(customerStore.currentCustomer.id, file.name)
  currentFileContent.value = res.data.content
  showFileDialog.value = true
}

function scrollToBottom() {
  nextTick(() => {
    if (chatArea.value) {
      chatArea.value.scrollTop = chatArea.value.scrollHeight
    }
  })
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.search-input {
  padding: 12px 16px;
}

.customer-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.customer-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.customer-item:hover {
  background: #f5f7fa;
}

.customer-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.customer-name {
  flex: 1;
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.customer-item:hover .delete-btn {
  opacity: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.toolbar {
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar h3 {
  font-size: 18px;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.message {
  margin-bottom: 16px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.message.user .message-content {
  background: #409eff;
  color: #fff;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.message.user .message-header {
  color: rgba(255,255,255,0.8);
}

.message-header .time {
  margin-left: auto;
}

.message-body {
  line-height: 1.6;
  white-space: pre-wrap;
}

.input-area {
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 12px;
}

.input-area .el-textarea {
  flex: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.files-list {
  padding: 16px;
}

.file-card {
  margin-bottom: 16px;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-info {
  color: #909399;
  font-size: 12px;
}

.file-info p {
  margin: 4px 0;
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