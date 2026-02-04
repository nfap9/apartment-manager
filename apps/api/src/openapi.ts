export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Apartment Manager API',
    version: '0.1.0',
    description: '公寓管理系统 API（多组织、多角色权限、公寓/房间/租客/租约/账单/通知/看板）',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: { summary: '健康检查', responses: { 200: { description: 'OK' } } },
    },
    '/auth/register': {
      post: { summary: '注册（手机号+密码）', responses: { 200: { description: 'OK' } } },
    },
    '/auth/login': { post: { summary: '登录', responses: { 200: { description: 'OK' } } } },
    '/auth/refresh': { post: { summary: '刷新 accessToken（refresh cookie）', responses: { 200: { description: 'OK' } } } },
    '/auth/logout': { post: { summary: '退出登录', responses: { 200: { description: 'OK' } } } },
    '/auth/me': { get: { summary: '获取当前用户与组织列表', responses: { 200: { description: 'OK' } } } },

    '/orgs': {
      get: { summary: '列出我加入的组织', responses: { 200: { description: 'OK' } } },
      post: { summary: '创建组织（自动创建 Admin 角色并赋权）', responses: { 201: { description: 'Created' } } },
    },
    '/orgs/{orgId}/me': {
      get: { summary: '获取我在组织内的权限', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/invites': { post: { summary: '生成邀请码', responses: { 201: { description: 'Created' } } } },
    '/orgs/{orgId}/invites/accept': { post: { summary: '通过邀请码加入组织', responses: { 200: { description: 'OK' } } } },

    '/orgs/{orgId}/permissions': { get: { summary: '权限列表', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/roles': {
      get: { summary: '角色列表', responses: { 200: { description: 'OK' } } },
      post: { summary: '创建角色', responses: { 201: { description: 'Created' } } },
    },
    '/orgs/{orgId}/roles/{roleId}/permissions': {
      get: { summary: '获取角色权限', responses: { 200: { description: 'OK' } } },
      put: { summary: '设置角色权限', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/members': { get: { summary: '成员列表', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/members/{memberId}/roles': { put: { summary: '成员分配角色', responses: { 200: { description: 'OK' } } } },

    '/orgs/{orgId}/apartments': {
      get: { summary: '公寓列表', responses: { 200: { description: 'OK' } } },
      post: { summary: '创建公寓', responses: { 201: { description: 'Created' } } },
    },
    '/orgs/{orgId}/apartments/{apartmentId}': {
      get: { summary: '公寓详情', responses: { 200: { description: 'OK' } } },
      put: { summary: '更新公寓', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/apartments/{apartmentId}/upstream': {
      get: { summary: '上游信息（读）', responses: { 200: { description: 'OK' } } },
      put: { summary: '上游信息（写）', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/apartments/{apartmentId}/fee-pricings': {
      get: { summary: '费用定价（读）', responses: { 200: { description: 'OK' } } },
      put: { summary: '费用定价（写）', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/apartments/{apartmentId}/rooms': {
      get: { summary: '房间列表', responses: { 200: { description: 'OK' } } },
      post: { summary: '创建房间', responses: { 201: { description: 'Created' } } },
    },
    '/orgs/{orgId}/rooms/{roomId}': {
      get: { summary: '房间详情', responses: { 200: { description: 'OK' } } },
      put: { summary: '更新房间', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/rooms/{roomId}/pricing-plans': {
      get: { summary: '房间价格方案（读）', responses: { 200: { description: 'OK' } } },
      put: { summary: '房间价格方案（写）', responses: { 200: { description: 'OK' } } },
    },

    '/orgs/{orgId}/tenants': {
      get: { summary: '租客列表', responses: { 200: { description: 'OK' } } },
      post: { summary: '创建租客', responses: { 201: { description: 'Created' } } },
    },
    '/orgs/{orgId}/tenants/{tenantId}': {
      get: { summary: '租客详情', responses: { 200: { description: 'OK' } } },
      put: { summary: '更新租客', responses: { 200: { description: 'OK' } } },
    },

    '/orgs/{orgId}/leases': {
      get: { summary: '租约列表', responses: { 200: { description: 'OK' } } },
      post: { summary: '创建租约', responses: { 201: { description: 'Created' } } },
    },
    '/orgs/{orgId}/leases/{leaseId}': {
      get: { summary: '租约详情', responses: { 200: { description: 'OK' } } },
      put: { summary: '更新租约', responses: { 200: { description: 'OK' } } },
    },

    '/orgs/{orgId}/billing/run': { post: { summary: '手动触发出账', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/invoices': { get: { summary: '账单列表', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/invoices/{invoiceId}': { get: { summary: '账单详情', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/invoices/{invoiceId}/items/{itemId}/confirm-reading': {
      post: { summary: '抄表确认', responses: { 200: { description: 'OK' } } },
    },

    '/orgs/{orgId}/notifications': { get: { summary: '站内通知列表', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/notifications/{notificationId}/read': {
      post: { summary: '标记通知已读', responses: { 200: { description: 'OK' } } },
    },

    '/orgs/{orgId}/dashboard/vacant-rooms': { get: { summary: '空房列表', responses: { 200: { description: 'OK' } } } },
    '/orgs/{orgId}/dashboard/lease-expiring': {
      get: { summary: '到期提醒', responses: { 200: { description: 'OK' } } },
    },
    '/orgs/{orgId}/dashboard/kpis': { get: { summary: 'KPI 指标', responses: { 200: { description: 'OK' } } } },
  },
} as const;

