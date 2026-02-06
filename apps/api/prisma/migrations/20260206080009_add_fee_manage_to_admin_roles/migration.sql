-- 确保 fee.manage 权限存在
INSERT INTO "Permission" ("id", "key", "description")
VALUES (gen_random_uuid(), 'fee.manage', '费用管理')
ON CONFLICT ("key") DO NOTHING;

-- 为所有现有的 Admin 角色添加 fee.manage 权限
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT 
  r."id" as "roleId",
  p."id" as "permissionId",
  NOW() as "createdAt"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Admin' 
  AND r."isSystem" = true
  AND p."key" = 'fee.manage'
  AND NOT EXISTS (
    SELECT 1 
    FROM "RolePermission" rp 
    WHERE rp."roleId" = r."id" 
      AND rp."permissionId" = p."id"
  );
