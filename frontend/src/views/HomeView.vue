<template>
  <div class="home-view">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <el-icon :size="28"><DataAnalysis /></el-icon>
        <h1>客户需求调研分析系统</h1>
      </div>
      <div class="header-actions">
        <el-button @click="$router.push('/config')">
          <el-icon><Setting /></el-icon> 配置
        </el-button>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon> 新建客户
        </el-button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <el-card class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总客户数</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value" style="color: #409eff">{{ stats.active }}</div>
        <div class="stat-label">跟进中</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value" style="color: #67c23a">{{ stats.won }}</div>
        <div class="stat-label">已成交</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value" style="color: #f56c6c">{{ stats.lost }}</div>
        <div class="stat-label">已流失</div>
      </el-card>
    </div>

    <!-- 状态筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="fetchCustomers">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="new">新建</el-radio-button>
        <el-radio-button label="contacted">已联系</el-radio-button>
        <el-radio-button label="requirements">需求收集</el-radio-button>
        <el-radio-button label="analyzed">已分析</el-radio-button>
        <el-radio-button label="quoted">已报价</el-radio-button>
        <el-radio-button label="negotiating">谈判中</el-radio-button>
        <el-radio-button label="won">已成交</el-radio-button>
        <el-radio-button label="paused">暂停</el-radio-button>
      </el-radio-group>
      
      <el-input
        v-model="searchQuery"
        placeholder="搜索客户名称、联系人、公司..."
        prefix-icon="Search"
        clearable
        style="width: 300px"
        @input="debounceSearch"
      />
    </div>

    <!-- 客户列表 -->
    <div class="customer-grid">
      <el-card
        v-for="customer in customers"
        :key="customer.id"
        class="customer-card"
        shadow="hover"
        @click="goToDetail(customer.id)"
      >
        <div class="card-header">
          <h3>{{ customer.name }}</h3>
          <el-tag :color="customer.statusColor" effect="dark" size="small">
            {{ customer.statusLabel }}
          </el-tag>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <el-icon><User /></el-icon>
            <span>{{ customer.contact_name || '未填写联系人' }}</span>
          </div>
          <div class="info-row">
            <el-icon><OfficeBuilding /></el-icon>
            <span>{{ customer.company || '未填写公司' }}</span>
          </div>
          <div class="info-row">
            <el-icon><Briefcase /></el-icon>
            <span>{{ customer.industry || '未填写行业' }}</span>
          </div>
          <div class="info-row">
            <el-icon><Money /></el-icon>
            <span>预算: {{ customer.estimated_budget || '未预估' }}</span>
          </div>
          <div class="info-row">
            <el-icon><Timer /></el-icon>
            <span>工时: {{ customer.estimated_hours ? customer.estimated_hours + 'h' : '未预估' }}</span>
          </div>
        </div>
        
        <div class="card-footer">
          <span class="update-time">更新: {{ formatTime(customer.updated_at) }}</span>
          <el-button 
            size="small" 
            type="danger" 
            link
            @click.stop="deleteCustomer(customer.id)"
          >
            删除
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 新建客户对话框 -->
    <el-dialog v-model="showAddDialog" title="新建客户" width="500px">
      <el-form :model="newCustomer" label-width="100px">
        <el-form-item label="客户名称" required>
          <el-input v-model="newCustomer.name" placeholder="如：XX科技有限公司" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="newCustomer.contact_name" placeholder="客户负责人姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="newCustomer.contact_phone" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="微信号">
          <el-input v-model="newCustomer.contact_wechat" placeholder="微信号" />
        </el-form-item>
        <el-form-item label="公司名称">
          <el-input v-model="newCustomer.company" placeholder="公司全称" />
        </el-form-item>
        <el-form-item label="所属行业">
          <el-select v-model="newCustomer.industry" placeholder="选择行业" style="width: 100%">
            <el-option label="互联网" value="互联网" />
            <el-option label="金融" value="金融" />
            <el-option label="教育" value="教育" />
            <el-option label="医疗" value="医疗" />
            <el-option label="制造业" value="制造业" />
            <el-option label="零售" value="零售" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="newCustomer.notes" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="createCustomer" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { customerApi } from '../api'

const router = useRouter()

const customers = ref([])
const stats = ref({ total: 0, active: 0, won: 0, lost: 0, byStatus: {} })
const filterStatus = ref('')
const searchQuery = ref('')
const showAddDialog = ref(false)
const creating = ref(false)

const newCustomer = ref({
  name: '',
  contact_name: '',
  contact_phone: '',
  contact_wechat: '',
  company: '',
  industry: '',
  notes: ''
})

let searchTimeout = null

onMounted(() => {
  fetchCustomers()
  fetchStats()
})

async function fetchCustomers() {
  try {
    const res = await customerApi.list({
      q: searchQuery.value,
      status: filterStatus.value
    })
    customers.value = res.data
  } catch (error) {
    ElMessage.error('获取客户列表失败')
  }
}

async function fetchStats() {
  try {
    const res = await customerApi.getStats()
    stats.value = res.data
  } catch (error) {
    console.error('获取统计失败', error)
  }
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchCustomers, 300)
}

async function createCustomer() {
  if (!newCustomer.value.name.trim()) {
    ElMessage.warning('请输入客户名称')
    return
  }
  
  creating.value = true
  try {
    await customerApi.create(newCustomer.value)
    ElMessage.success('客户创建成功')
    showAddDialog.value = false
    newCustomer.value = { name: '', contact_name: '', contact_phone: '', contact_wechat: '', company: '', industry: '', notes: '' }
    fetchCustomers()
    fetchStats()
  } catch (error) {
    ElMessage.error('创建失败: ' + error.message)
  } finally {
    creating.value = false
  }
}

async function deleteCustomer(id) {
  try {
    await ElMessageBox.confirm('确定删除该客户？相关数据将全部删除', '警告', { 
      type: 'warning',
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger'
    })
    await customerApi.delete(id)
    ElMessage.success('删除成功')
    fetchCustomers()
    fetchStats()
  } catch {
    // 取消
  }
}

function goToDetail(id) {
  router.push(`/customer/${id}`)
}

function formatTime(time) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: #fff;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.filter-bar {
  padding: 0 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.customer-grid {
  padding: 0 24px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.customer-card {
  cursor: pointer;
  transition: all 0.3s;
}

.customer-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 13px;
}

.info-row .el-icon {
  color: #909399;
}

.card-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-time {
  font-size: 12px;
  color: #909399;
}
</style>