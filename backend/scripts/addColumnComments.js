/**
 * 为所有主要表的字段添加中文注释
 * 基于实际字段名
 */

import pg from 'pg';

const pool = new pg.Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

// 基于实际字段名的注释映射
const columnComments = {
  'jso_system_user_management': {
    'id': '用户ID',
    'username': '用户名',
    'password': '密码',
    'real_name': '真实姓名',
    'employee_id': '员工ID',
    'role_id': '角色ID',
    'plant_id': '厂区ID',
    'department_id': '部门ID',
    'status': '状态',
    'sap_employee_id': 'SAP员工ID',
    'gender': '性别',
    'position': '职位',
    'level': '级别',
    'phone': '电话',
    'hire_date': '入职日期',
    'leave_date': '离职日期',
    'ic_card_number': 'IC卡号',
    'employee_type': '员工类型',
    'login_count': '登录次数',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'must_change_password': '是否必须改密码',
    'password_changed_at': '密码修改时间',
    'security_question': '安全问题',
    'security_answer': '安全答案',
    'old_employee_id': '旧员工ID',
    'last_login_at': '最后登录时间',
    'email': '邮箱'
  },

  'jso_system_role_management': {
    'id': '角色ID',
    'name': '角色名称',
    'description': '描述',
    'status': '状态',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_system_permissions': {
    'id': '权限ID',
    'name': '权限名称',
    'code': '权限代码',
    'module': '所属模块',
    'description': '描述',
    'parent_id': '父级权限ID',
    'sort_order': '排序',
    'created_at': '创建时间',
    'icon': '图标',
    'route_path': '路由路径'
  },

  'jso_system_role_permissions': {
    'id': 'ID',
    'role_id': '角色ID',
    'permission_id': '权限ID',
    'created_at': '创建时间'
  },

  'jso_system_user_permissions': {
    'id': 'ID',
    'user_id': '用户ID',
    'permission_id': '权限ID',
    'created_at': '创建时间'
  },

  'jso_system_modules': {
    'id': '模块ID',
    'name': '模块名称',
    'code': '模块代码',
    'parent_id': '父级ID',
    'icon': '图标',
    'route': '路由',
    'sort_order': '排序',
    'is_active': '是否启用',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'description': '描述',
    'config': '配置'
  },

  'jso_system_announcements': {
    'id': '公告ID',
    'title': '标题',
    'content': '内容',
    'type': '类型',
    'priority': '优先级',
    'status': '状态',
    'publish_at': '发布时间',
    'expire_at': '过期时间',
    'created_by': '创建人',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_system_notification': {
    'id': '通知ID',
    'user_id': '用户ID',
    'title': '标题',
    'content': '内容',
    'type': '类型',
    'is_read': '是否已读',
    'read_at': '阅读时间',
    'created_at': '创建时间',
    'link': '链接',
    'metadata': '元数据'
  },

  'jso_jwt_blacklist': {
    'id': 'ID',
    'token': 'Token',
    'expired_at': '过期时间',
    'blacklisted_at': '加入黑名单时间',
    'reason': '原因'
  },

  'operation_logs': {
    'id': '日志ID',
    'user_id': '用户ID',
    'action': '操作',
    'table_name': '表名',
    'record_id': '记录ID',
    'old_value': '旧值',
    'new_value': '新值',
    'ip_address': 'IP地址',
    'user_agent': '用户代理',
    'created_at': '创建时间',
    'details': '详情'
  },

  'jso_system_permission_logs': {
    'id': '日志ID',
    'user_id': '用户ID',
    'action': '操作',
    'permission_id': '权限ID',
    'role_id': '角色ID',
    'changes': '变更内容',
    'ip_address': 'IP地址',
    'created_at': '创建时间'
  },

  'jso_org_plant_management': {
    'id': '厂区ID',
    'plant_code': '厂区代码',
    'plant_name': '厂区名称',
    'address': '地址',
    'contact': '联系人',
    'phone': '电话',
    'status': '状态',
    'created_at': '创建时间'
  },

  'jso_org_department_management': {
    'id': '部门ID',
    'dept_code': '部门代码',
    'dept_name': '部门名称',
    'parent_id': '父级部门ID',
    'plant_id': '厂区ID',
    'manager_id': '部门经理ID',
    'level': '层级',
    'status': '状态',
    'created_at': '创建时间'
  },

  'jso_hr_employee_roster': {
    'id': '记录ID',
    'username': '用户名',
    'sap_employee_id': 'SAP员工ID',
    'real_name': '真实姓名',
    'gender': '性别',
    'position': '职位',
    'level': '级别',
    'phone': '电话',
    'hire_date': '入职日期',
    'leave_date': '离职日期',
    'ic_card_number': 'IC卡号',
    'employee_type': '员工类型',
    'plant_id': '厂区ID',
    'department_id': '部门ID',
    'status': '状态',
    'login_count': '登录次数',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_hr_employee_schedule': {
    'id': '排班ID',
    'employee_no': '工号',
    'schedule_date': '排班日期',
    'shift_type': '班次类型',
    'start_time': '开始时间',
    'end_time': '结束时间',
    'break_duration': '休息时长',
    'is_holiday': '是否假日',
    'is_overtime': '是否加班',
    'notes': '备注',
    'created_at': '创建时间'
  },

  'jso_hr_workstation_arrangement': {
    'id': '安排ID',
    'employee_no': '工号',
    'workstation': '工位',
    'area': '区域',
    'start_date': '开始日期',
    'end_date': '结束日期',
    'reason': '原因',
    'status': '状态',
    'approved_by': '审批人',
    'approved_at': '审批时间',
    'created_at': '创建时间'
  },

  'jso_hr_formal_leave': {
    'id': '请假ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'leave_type': '请假类型',
    'start_date': '开始日期',
    'end_date': '结束日期',
    'duration': '时长',
    'reason': '原因',
    'status': '状态',
    'approver': '审批人',
    'approved_at': '审批时间',
    'approver_comment': '审批意见',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_hr_temporary_leave': {
    'id': '请假ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'leave_date': '请假日期',
    'leave_type': '请假类型',
    'start_time': '开始时间',
    'end_time': '结束时间',
    'duration_hours': '时长(小时)',
    'reason': '原因',
    'status': '状态',
    'approved_by': '审批人',
    'created_at': '创建时间'
  },

  'jso_hr_temporary_overtime': {
    'id': '加班ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'overtime_date': '加班日期',
    'start_time': '开始时间',
    'end_time': '结束时间',
    'duration_hours': '加班时长',
    'reason': '原因',
    'is_approved': '是否批准',
    'approved_by': '审批人',
    'approved_at': '审批时间',
    'status': '状态',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'task_description': '任务描述'
  },

  'jso_hr_special_working_hours': {
    'id': '记录ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'special_date': '特殊日期',
    'hours_worked': '工作时长',
    'hours_type': '工时类型',
    'reason': '原因',
    'status': '状态',
    'approved_by': '审批人',
    'created_at': '创建时间'
  },

  'jso_hr_resignation_transfer': {
    'id': '记录ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'current_department': '当前部门',
    'target_department': '目标部门',
    'transfer_type': '转岗类型',
    'transfer_date': '转岗日期',
    'reason': '原因',
    'status': '状态',
    'initiator': '发起人',
    'approver': '审批人',
    'approved_at': '审批时间',
    'effective_date': '生效日期',
    'comments': '备注',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'documents': '附件',
    'handover_person': '交接人',
    'handover_date': '交接日期'
  },

  'jso_hr_work_hours': {
    'id': '记录ID',
    'employee_no': '工号',
    'work_date': '工作日期',
    'regular_hours': '正常工时',
    'overtime_hours': '加班工时',
    'total_hours': '总工时',
    'status': '状态',
    'created_at': '创建时间'
  },

  'jso_hr_monthly_attendance_summary': {
    'id': '汇总ID',
    'employee_no': '工号',
    'month': '月份',
    'year': '年份',
    'regular_hours': '正常工时',
    'overtime_hours': '加班工时',
    'leave_hours': '请假工时',
    'absence_hours': '缺勤工时',
    'total_hours': '总工时',
    'late_count': '迟到次数',
    'early_leave_count': '早退次数',
    'created_at': '创建时间'
  },

  'jso_hr_break7_records': {
    'id': '记录ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'start_date': '开始日期',
    'end_date': '结束日期',
    'duration': '持续天数',
    'reason': '原因',
    'status': '状态',
    'approved_by': '审批人',
    'created_at': '创建时间',
    'notes': '备注',
    'department': '部门'
  },

  'jso_hr_weekly_hour_limit_records': {
    'id': '记录ID',
    'employee_no': '工号',
    'week_start_date': '周开始日期',
    'week_end_date': '周结束日期',
    'total_hours': '总工时',
    'regular_hours': '正常工时',
    'overtime_hours': '加班工时',
    'status': '状态',
    'is_exceeded': '是否超标',
    'exceeded_hours': '超标工时',
    'notes': '备注',
    'created_at': '创建时间',
    'reviewed_by': '审核人',
    'reviewed_at': '审核时间'
  },

  'jso_actual_work_hours': {
    'id': '记录ID',
    'employee_no': '工号',
    'work_date': '工作日期',
    'actual_hours': '实际工时',
    'record_type': '记录类型',
    'created_at': '创建时间'
  },

  'jso_config_dept_calc_rules': {
    'id': '规则ID',
    'rule_name': '规则名称',
    'department': '部门',
    'calculation_type': '计算类型',
    'formula': '公式',
    'parameters': '参数',
    'is_active': '是否启用',
    'priority': '优先级',
    'effective_date': '生效日期',
    'expiry_date': '过期日期',
    'description': '描述',
    'created_by': '创建人',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_config_shift_duration_rules': {
    'id': '规则ID',
    'shift_name': '班次名称',
    'shift_code': '班次代码',
    'start_time': '开始时间',
    'end_time': '结束时间',
    'duration_hours': '持续时长',
    'break_start': '休息开始时间',
    'break_end': '休息结束时间',
    'is_active': '是否启用',
    'department': '部门',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_config_welfare': {
    'id': '福利ID',
    'welfare_name': '福利名称',
    'welfare_type': '福利类型',
    'description': '描述',
    'eligible_criteria': '资格标准',
    'amount': '金额',
    'is_active': '是否启用',
    'created_at': '创建时间'
  },

  'jso_config_welfare_base_rates': {
    'id': '费率ID',
    'rate_type': '费率类型',
    'rate_value': '费率值',
    'effective_date': '生效日期',
    'expiry_date': '过期日期',
    'is_active': '是否启用'
  },

  'jso_config_employee_hourly_rates': {
    'id': '费率ID',
    'employee_no': '工号',
    'employee_name': '员工姓名',
    'hourly_rate': '时薪',
    'overtime_rate': '加班费率',
    'effective_date': '生效日期',
    'created_at': '创建时间'
  },

  'jso_config_workstation': {
    'id': '工位ID',
    'workstation_code': '工位代码',
    'workstation_name': '工位名称',
    'area': '区域',
    'building': '建筑',
    'floor': '楼层',
    'status': '状态',
    'capacity': '容量',
    'created_at': '创建时间'
  },

  'jso_position_reason_config': {
    'id': '配置ID',
    'position': '职位',
    'reason_code': '原因代码',
    'reason_name': '原因名称',
    'description': '描述',
    'is_active': '是否启用'
  },

  // SAP数据表
  'jso_sap_pull_log_partitioned': {
    'id': '记录ID',
    'plant': '工厂',
    'warehouse': '仓库',
    'date_created': '创建日期',
    'time_created': '创建时间',
    'user_name': '用户名',
    'seq_no': '序列号',
    'trans': '事务类型',
    'rf_ind': 'RF标识',
    'success': '成功标识',
    'mvt': '移动类型',
    'from_sloc': '源库存地',
    'to_sloc': '目标库存地',
    'material': '物料',
    'quantity': '数量',
    'supplier': '供应商',
    'type': '类型',
    'storage_bin': '存储箱',
    's1': '备用字段1',
    's2': '备用字段2',
    'batch': '批次',
    'new_batch': '新批次',
    'reference': '参考号',
    'rec_mat': '接收物料',
    'old_grn': '旧GRN',
    'new_grn': '新GRN',
    'ip_address': 'IP地址',
    'term_id': '终端ID',
    'mat_doc': '物料凭证',
    'item1': '项目号1',
    'to_number': '目标编号',
    'item2': '项目号2',
    'doc': '凭证号',
    'item3': '项目号3',
    'is_ind': '是否独立',
    'rv': '参考值',
    'vnt': '供应商编号',
    'hu': '处理单元',
    'created_at': '创建时间'
  },

  'jso_sap_grn_history_partitioned': {
    'id': '记录ID',
    'plant': '工厂',
    'warehouse': '仓库',
    'to_number': '目标编号',
    'to_item': '目标项目',
    'gr_document': '收货凭证',
    'to_qty': '目标数量',
    'material': '物料',
    'quantity': '数量',
    'movmt_type': '移动类型',
    'special': '特殊指示',
    'vendor': '供应商',
    'batch': '批次',
    'creation_date': '创建日期',
    'creation_time': '创建时间',
    'created_by': '创建人',
    'trans': '事务类型',
    'from_sloc': '源库存地',
    'to_sloc': '目标库存地',
    'reference': '参考号',
    'masked_mpn': 'MPN(脱敏)',
    'manufacturer': '制造商',
    'media_code': '媒体代码',
    'lot_code': '批次代码',
    'date_code': '日期代码',
    'cert_type': '证书类型',
    'sled': '有效期',
    'created_at': '创建时间',
    'is_processed': '是否处理',
    'processed_at': '处理时间',
    'gr_date': 'GR日期',
    'mfg_date': '制造日期',
    'manufacturer_code': '制造商代码',
    'process_result': '处理结果',
    'processed_by': '处理人'
  },

  'jso_sap_item_pull_history': {
    'id': '记录ID',
    'file_name': '文件名',
    'record_count': '记录数',
    'status': '状态',
    'error_message': '错误信息',
    'pull_date': '拉取日期'
  },

  'jso_sap_grn_pull_history': {
    'id': '记录ID',
    'file_name': '文件名',
    'record_count': '记录数',
    'status': '状态',
    'error_message': '错误信息',
    'pull_date': '拉取日期'
  },

  'jso_sap_pull_history': {
    'id': '记录ID',
    'pull_type': '拉取类型',
    'file_path': '文件路径',
    'records_count': '记录数',
    'status': '状态',
    'error_message': '错误信息',
    'started_at': '开始时间',
    'completed_at': '完成时间'
  },

  'jso_pulllist_item_count_partitioned': {
    'id': '记录ID',
    'pulllist_no': '拉取单号',
    'data_date': '数据日期',
    'item_count': '物料数量',
    'last_calculated_at': '最后计算时间'
  },

  'jso_pulllist_item_count': {
    'id': '记录ID',
    'pulllist_no': '拉取单号',
    'data_date': '数据日期',
    'item_count': '物料数量',
    'last_calculated_at': '最后计算时间'
  },

  'jso_stockroom_urgent_pull_data': {
    'id': '记录ID',
    'build_plan': '生产工单',
    'customer': '客户',
    'material_req_time': '物料需求时间',
    'pulllist_no': '拉取单号',
    'part_number': '物料号',
    'part_desc': '物料描述',
    'qty_required': '需求数量',
    'qty_allocated': '分配数量',
    'qty_short': '短缺数量',
    'bin_location': '库位',
    'is_pull_list_shortage': '是否缺料',
    'build_plan_id': '工单ID',
    'bp_type': '工单类型',
    'qm': 'QM',
    'sloc': '库存地',
    'storage_area': '存储区域',
    'step': '步骤',
    'factory_ma_route': '工厂路线',
    'sets': '套数',
    'sap_model': 'SAP模型',
    'assembly': '装配',
    'creator': '创建人',
    'create_time': '创建时间',
    'data_date': '数据日期',
    'pulled_at': '拉取时间',
    'warehouse': '仓库',
    'item_count': '物料数量'
  },

  'jso_stockroom_urgent_pull_data_archive': {
    'id': '记录ID',
    'build_plan': '生产工单',
    'customer': '客户',
    'material_req_time': '物料需求时间',
    'pulllist_no': '拉取单号',
    'part_number': '物料号',
    'part_desc': '物料描述',
    'qty_required': '需求数量',
    'qty_allocated': '分配数量',
    'qty_short': '短缺数量',
    'bin_location': '库位',
    'is_pull_list_shortage': '是否缺料',
    'build_plan_id': '工单ID',
    'bp_type': '工单类型',
    'qm': 'QM',
    'sloc': '库存地',
    'storage_area': '存储区域',
    'step': '步骤',
    'factory_ma_route': '工厂路线',
    'sets': '套数',
    'sap_model': 'SAP模型',
    'assembly': '装配',
    'creator': '创建人',
    'create_time': '创建时间',
    'data_date': '数据日期',
    'pulled_at': '拉取时间',
    'warehouse': '仓库',
    'item_count': '物料数量',
    'archived_at': '归档时间'
  },

  'jso_stockroom_urgent_pull_config': {
    'id': '配置ID',
    'config_key': '配置键',
    'config_value': '配置值',
    'description': '描述',
    'is_active': '是否启用',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'category': '分类',
    'plant': '厂区'
  },

  'jso_k045_document': {
    'id': '单据ID',
    'document_no': '单据号',
    'wc_name': '工作中心名称',
    'attachment_url': '附件地址',
    'attachment_name': '附件名称',
    'delivery_location': '交货地点',
    'submitter_name': '提交人',
    'is_urgent': '是否紧急',
    'is_rush': '是否加急',
    'status': '状态',
    'submitted_at': '提交时间',
    'received_at': '接收时间',
    'received_by': '接收人',
    'signed_at': '签收时间',
    'signed_by': '签收人',
    'distribution_ended_at': '分发完成时间',
    'rejected_at': '拒绝时间',
    'reject_reason': '拒绝原因',
    'withdrawn_at': '撤回时间',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'returned_at': '退回时间',
    'returned_by': '退回人',
    'return_reason': '退回原因',
    'completed_at': '完成时间',
    'completed_by': '完成人',
    'material_sent_at': '物料发送时间'
  },

  'jso_k045_notification_config': {
    'id': '配置ID',
    'notification_type': '通知类型',
    'recipient': '接收人',
    'cc_list': '抄送列表',
    'is_active': '是否启用',
    'trigger_condition': '触发条件',
    'created_at': '创建时间'
  },

  'jso_k2_diff_registration': {
    'id': '记录ID',
    'diff_no': '差异单号',
    'document_no': '单据号',
    'diff_type': '差异类型',
    'description': '描述',
    'amount': '金额',
    'status': '状态',
    'reporter': '报告人',
    'report_date': '报告日期',
    'handler': '处理人',
    'handled_date': '处理日期',
    'result': '处理结果',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_k2_diff_config': {
    'id': '配置ID',
    'config_name': '配置名称',
    'config_type': '配置类型',
    'threshold': '阈值',
    'is_active': '是否启用',
    'description': '描述'
  },

  'jso_da_material_document': {
    'id': '单据ID',
    'document_no': '单据号',
    'document_type': '单据类型',
    'control_type': '管控类型',
    'material': '物料',
    'quantity': '数量',
    'unit': '单位',
    'supplier': '供应商',
    'status': '状态',
    'applicant': '申请人',
    'apply_date': '申请日期',
    'approver': '审批人',
    'approval_date': '审批日期',
    'approval_comment': '审批意见',
    'due_date': '到期日期',
    'completed_date': '完成日期',
    'priority': '优先级',
    'notes': '备注',
    'attachment_urls': '附件地址',
    'reference_no': '参考号',
    'warehouse': '仓库',
    'location': '位置',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'last_status_change': '最后状态变更',
    'reminder_sent': '是否已发提醒',
    'reminder_date': '提醒日期',
    'external_ref': '外部参考'
  },

  'jso_da_material_notification_config': {
    'id': '配置ID',
    'notification_type': '通知类型',
    'recipient_role': '接收人角色',
    'recipient_email': '接收人邮箱',
    'is_active': '是否启用',
    'days_before': '提前天数',
    'message_template': '消息模板'
  },

  'jso_material_extension': {
    'id': '延期ID',
    'grn': 'GRN号',
    'date_code': '日期代码',
    'extension_date': '延期日期',
    'extension_file_no': '延期文件号',
    'user_name': '用户名',
    'update_date': '更新日期',
    'last_sync_time': '最后同步时间',
    'raw_data': '原始数据',
    'status': '状态'
  },

  'jso_material_extension_pull_log': {
    'id': '日志ID',
    'source_url': '数据源URL',
    'records_count': '记录数',
    'status': '状态',
    'error_message': '错误信息',
    'started_at': '开始时间',
    'completed_at': '完成时间'
  },

  'jso_material_package': {
    'id': '包装ID',
    'material': '物料',
    'package_type': '包装类型',
    'package_size': '包装尺寸',
    'quantity_per_unit': '每单位数量',
    'weight': '重量',
    'dimensions': '尺寸',
    'barcode': '条形码',
    'qr_code': '二维码',
    'description': '描述',
    'is_active': '是否启用',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_pnc_transfer_config': {
    'id': '配置ID',
    'config_key': '配置键',
    'config_value': '配置值',
    'description': '描述',
    'plant': '厂区',
    'is_active': '是否启用',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'category': '分类',
    'priority': '优先级'
  },

  'jso_pnc_transfer_document': {
    'id': '单据ID',
    'document_no': '单据号',
    'from_warehouse': '源仓库',
    'to_warehouse': '目标仓库',
    'transfer_type': '转仓类型',
    'status': '状态',
    'requester': '申请人',
    'request_date': '申请日期',
    'approver': '审批人',
    'approval_date': '审批日期',
    'comments': '备注',
    'total_quantity': '总数量',
    'total_amount': '总金额',
    'plant': '厂区',
    'priority': '优先级',
    'expected_date': '期望日期',
    'completed_date': '完成日期',
    'created_at': '创建时间',
    'updated_at': '更新时间'
  },

  'jso_pnc_transfer_document_item': {
    'id': '明细ID',
    'document_id': '单据ID',
    'material': '物料',
    'material_desc': '物料描述',
    'quantity': '数量',
    'unit': '单位',
    'batch_no': '批次号',
    'from_location': '源库位',
    'to_location': '目标库位',
    'status': '状态'
  },

  'jso_pnc_transfer_print_log': {
    'id': '日志ID',
    'document_no': '单据号',
    'printed_by': '打印人',
    'print_time': '打印时间',
    'printer_name': '打印机名称',
    'copies': '份数'
  },

  'jso_cost_summary': {
    'id': '汇总ID',
    'summary_period': '汇总周期',
    'cost_type': '成本类型',
    'department': '部门',
    'total_cost': '总成本',
    'currency': '币种',
    'status': '状态',
    'created_at': '创建时间',
    'updated_at': '更新时间',
    'approved_by': '审批人',
    'approved_at': '审批时间',
    'comments': '备注'
  },

  'jso_cost_summary_data': {
    'id': '数据ID',
    'summary_id': '汇总ID',
    'cost_item': '成本项目',
    'amount': '金额',
    'quantity': '数量',
    'unit_price': '单价',
    'category': '分类',
    'description': '描述',
    'date': '日期',
    'reference': '参考号',
    'status': '状态'
  },

  'jso_announcement_read_records': {
    'id': '记录ID',
    'announcement_id': '公告ID',
    'user_id': '用户ID',
    'read_at': '阅读时间'
  },

  'jso_task_log': {
    'id': '日志ID',
    'task_name': '任务名称',
    'task_type': '任务类型',
    'file_path': '文件路径',
    'records_count': '记录数',
    'status': '状态',
    'error_message': '错误信息',
    'started_at': '开始时间',
    'completed_at': '完成时间'
  },

  'jso_system_migrations': {
    'id': '迁移ID',
    'migration_name': '迁移名称',
    'applied_at': '应用时间'
  }
};

async function addColumnComments() {
  console.log('开始为字段添加注释...\n');

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const [tableName, columns] of Object.entries(columnComments)) {
    for (const [columnName, comment] of Object.entries(columns)) {
      try {
        const escapedComment = comment.replace(/'/g, "''");
        await pool.query(
          `COMMENT ON COLUMN "${tableName}"."${columnName}" IS '${escapedComment}'`
        );
        success++;
      } catch (e) {
        if (e.message.includes('does not exist')) {
          skipped++;
        } else {
          failed++;
        }
      }
    }
  }

  console.log('\n========== 完成 ==========');
  console.log('成功:', success);
  console.log('失败:', failed);
  console.log('跳过:', skipped);

  await pool.end();
}

addColumnComments().catch(console.error);
