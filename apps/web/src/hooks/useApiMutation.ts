import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleApiError } from '../lib/api/errorHandler';

/**
 * API 变更操作的配置
 */
export interface UseApiMutationOptions<TData, TVariables> {
  /**
   * 变更函数
   */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /**
   * 成功后的回调
   */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  /**
   * 失败后的回调
   */
  onError?: (error: unknown, variables: TVariables) => void;
  /**
   * 成功后需要失效的查询键
   */
  invalidateQueries?: Array<readonly unknown[]>;
  /**
   * 成功消息
   */
  successMessage?: string;
  /**
   * 错误消息
   */
  errorMessage?: string;
}

/**
 * 封装 API 变更操作的 Hook
 * 统一处理错误、加载状态和查询失效
 */
export function useApiMutation<TData = void, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>,
) {
  const {
    mutationFn,
    onSuccess,
    onError,
    invalidateQueries = [],
    errorMessage,
  } = options;

  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutation = useMutation({
    mutationFn,
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: async (data, variables) => {
      // 失效相关查询
      for (const queryKey of invalidateQueries) {
        await queryClient.invalidateQueries({ queryKey });
      }

      // 执行成功回调
      if (onSuccess) {
        await onSuccess(data, variables);
      }

      setIsLoading(false);
    },
    onError: (error, variables) => {
      // 统一错误处理
      handleApiError(error, errorMessage);

      // 执行错误回调
      if (onError) {
        onError(error, variables);
      }

      setIsLoading(false);
    },
  });

  return {
    ...mutation,
    isLoading: isLoading || mutation.isPending,
  };
}
