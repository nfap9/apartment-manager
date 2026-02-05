import type { AxiosError } from 'axios';
import { message } from 'antd';
import type { ApiErrorResponse } from '../apiTypes';

/**
 * 统一处理 API 错误
 * @param error - Axios 错误对象
 * @param defaultMessage - 默认错误消息
 * @returns 错误消息字符串
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = '操作失败',
): string {
  const e = error as AxiosError<ApiErrorResponse>;
  const errorMessage = e.response?.data?.error?.message ?? defaultMessage;
  message.error(errorMessage);
  return errorMessage;
}

/**
 * 静默处理 API 错误（不显示消息）
 * @param error - Axios 错误对象
 * @param defaultMessage - 默认错误消息
 * @returns 错误消息字符串
 */
export function getApiErrorMessage(
  error: unknown,
  defaultMessage: string = '操作失败',
): string {
  const e = error as AxiosError<ApiErrorResponse>;
  return e.response?.data?.error?.message ?? defaultMessage;
}
