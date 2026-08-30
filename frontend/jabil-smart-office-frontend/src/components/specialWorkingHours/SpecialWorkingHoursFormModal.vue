<template>
  <el-dialog :title="title" v-model="dialogVisible" width="600px" :before-close="handleClose" destroy-on-close>
    <el-form ref="form" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="日期" prop="date">
        <el-date-picker v-model="form.date" type="date" placeholder="选择日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%;"></el-date-picker>
      </el-form-item>

      <el-form-item label="事项" prop="event">
        <el-select
          v-model="form.event"
          filterable
          allow-create
          default-first-option
          placeholder="请选择或输入事项"
          style="width: 100%;"
        >
          <el-option
            v-for="item in eventOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="部门选择">
        <el-select
          v-model="selectedDepartmentId"
          placeholder="请选择部门"
          style="width: 100%;"
          clearable
          :disabled="isDepartmentSelectDisabled"
          @change="handleDepartmentChange"
        >
          <el-option
            v-for="department in departmentList"
            :key="department.id"
            :label="department.departmentName"
            :value="department.id"
          ></el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="人员选择" prop="employeeNames">
        <el-select
          v-model="form.employeeNames"
          multiple
          filterable
          placeholder="请选择人员"
          style="width: 100%;"
        >
          <el-option
            v-for="user in filteredUserList"
            :key="user.employeeName"
            :label="user.employeeName"
            :value="user.employeeName"
          ></el-option>
        </el-select>
        <el-button link @click="toggleSelectAllUsers">
          {{ isAllUsersSelected ? '取消全选' : '全选' }}
        </el-button>
      </el-form-item>

      <el-form-item label="开始时间" prop="startTime">
        <el-time-picker
          v-model="form.startTime"
          placeholder="选择开始时间"
          value-format="HH:mm"
          style="width: 100%;"
        ></el-time-picker>
      </el-form-item>

      <el-form-item label="结束时间" prop="endTime">
        <el-time-picker
          v-model="form.endTime"
          placeholder="选择结束时间"
          value-format="HH:mm"
          style="width: 100%;"
        ></el-time-picker>
      </el-form-item>

      <el-form-item label="登记人">
        <el-input v-model="form.registeredBy" disabled></el-input>
      </el-form-item>
    </el-form>

    <template v-slot:footer>
<span  class="dialog-footer">
      <el-button @click="handleClose">取 消</el-button>
      <el-button type="primary" @click="handleSubmit">确 定</el-button>
    </span>
</template>
  </el-dialog>
</template>

<script>
import { EVENT_OPTIONS } from '@/utils/constants'
import { getUserList, getDepartmentList } from '@/api/userManagement'
import dayjs from '@/plugins/dayjs'

export default {
  name: 'SpecialWorkingHoursFormModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '新增特殊工时'
    },
    formData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      dialogVisible: this.visible,
      form: {
        date: null,
        event: '',
        employeeNames: [], // 多选人员
        startTime: null,
        endTime: null,
        registeredBy: '' // 登记人，将在 created 中获取
      },
      rules: {
        date: [{ required: true, message: '请选择日期', trigger: 'change' }],
        event: [{ required: true, message: '请选择或输入事项', trigger: 'change' }],
        employeeNames: [{ required: true, message: '请选择人员', trigger: 'change' }],
        startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
        endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
      },
      eventOptions: EVENT_OPTIONS,
      userList: [], // 原始所有人员列表
      departmentList: [], // 部门列表
      selectedDepartmentId: null, // 选中的部门ID
      isDepartmentSelectDisabled: false, // 部门选择器是否禁用
      isAllUsersSelected: false
    }
  },
  created() {
    // 初始化登记人为当前登录用户
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.form.registeredBy = currentUser.realName || currentUser.username || '';
    }
  },
  computed: {
    filteredUserList() {
      if (!this.selectedDepartmentId) {
        return this.userList;
      }
      return this.userList.filter(user => user.departmentId === this.selectedDepartmentId);
    }
  },
  watch: {
    async visible(val) {
      this.dialogVisible = val
      if (val) {
        this.resetForm()
        if (this.formData.id) {
          // 编辑模式下，填充表单
          Object.assign(this.form, this.formData)
        }
        // 始终设置登记人为当前登录用户（新增和编辑都适用）
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          this.form.registeredBy = currentUser.realName || currentUser.username || '';
        }
        this.loadUserList() // 每次打开弹窗加载人员列表
        await this.loadDepartmentList() // 每次打开弹窗加载部门列表
        this.setDefaultDepartment(); // 设置默认部门
      }
    }
  },
  methods: {
    handleClose() {
      this.$refs.form.resetFields()
      this.$emit('update:visible', false)
    },
    handleSubmit() {
      this.$refs.form.validate(valid => {
        if (valid) {
          // 检查开始时间是否早于结束时间
          const startTime = this.form.startTime;
          const endTime = this.form.endTime;
          if (startTime && endTime && startTime >= endTime) {
            this.$message.error('开始时间必须早于结束时间！');
            return;
          }

          // 直接传递日期和时间，后端会处理组合
          const formattedForm = {
            ...this.form,
            date: dayjs(this.form.date, ['YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'YYYY-MM-DD HH:mm:ss']).format('YYYY-MM-DD'), // 确保日期格式正确
            startTime: this.form.startTime, // HH:mm 格式
            endTime: this.form.endTime // HH:mm 格式
          }
          this.$emit('submit', formattedForm)
        } else {
          return false
        }
      })
    },
    resetForm() {
      this.form = {
        date: null,
        event: '',
        employeeNames: [],
        startTime: null,
        endTime: null,
        registeredBy: '当前登录账号' // 实际应从登录信息获取
      }
      this.isAllUsersSelected = false;
      this.selectedDepartmentId = null; // 重置选中的部门
      this.isDepartmentSelectDisabled = false; // 重置部门选择器禁用状态
      this.$nextTick(() => {
        if (this.$refs.form) { this.$refs.form.clearValidate(); }
      });
    },
    async loadUserList() {
      try {
        const result = await getUserList();
        const userArray = result?.users || result?.items || [];
        this.userList = userArray.map(user => ({ employeeName: user.realName, oldEmployeeId: user.oldEmployeeId, id: user.id, departmentId: user.departmentId }));
      } catch (error) {
        this.$message.error('获取用户列表失败：' + (error?.message || '未知错误'));
      }
    },
    async loadDepartmentList() {
      try {
        const result = await getDepartmentList();
        const deptArray = result?.departments || result?.items || [];
        this.departmentList = deptArray.map(dept => ({
          id: dept.id,
          departmentName: dept.name || dept.departmentName
        }));
      } catch (error) {
        this.$message.error('获取部门列表失败：' + (error?.message || '未知错误'));
      }
    },
    handleDepartmentChange() {
      this.form.employeeNames = []; // 清空已选人员
      this.isAllUsersSelected = false; // 重置全选状态
    },
    toggleSelectAllUsers() {
      if (this.isAllUsersSelected) {
        this.form.employeeNames = []
      } else {
        this.form.employeeNames = this.filteredUserList.map(user => user.employeeName)
      }
      this.isAllUsersSelected = !this.isAllUsersSelected
    },
    getCurrentUser() {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          return JSON.parse(userStr)
        }
      } catch (error) {
      }
      return null
    },
    setDefaultDepartment() {
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.departmentId && this.departmentList.length > 0) {
        const userDepartment = this.departmentList.find(dept => dept.id === currentUser.departmentId);
        if (userDepartment) {
          this.selectedDepartmentId = userDepartment.id;
          this.isDepartmentSelectDisabled = true; // 设置默认部门后禁用选择器
        }
      }
    },
  }
}
</script>

<style scoped>
</style>