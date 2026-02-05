import type { Rule } from 'antd/es/form';

/**
 * 表单验证规则
 */

/**
 * 手机号验证规则
 */
export const phoneRules: Rule[] = [
  { required: true, message: '请输入手机号' },
  { pattern: /^[0-9]+$/, message: '手机号格式不正确' },
];

/**
 * 必填规则
 */
export function requiredRule(message: string = '此项为必填项'): Rule {
  return { required: true, message };
}

/**
 * 金额验证规则（元）
 */
export const moneyRules: Rule[] = [
  { required: true, message: '请输入金额' },
  { type: 'number', min: 0, message: '金额必须大于等于0' },
];
