'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAllImports, deleteImport, type UploadImportInput, uploadImport } from '../client/actions';
import { getImportDetail, getLatestComparisonSummary, listImports } from '../client/queries';

/** クエリキー。ミューテーション後は all を無効化して一覧・詳細・ダッシュボードをまとめて再取得する */
export const followerImportKeys = {
    all: ['follower-import'] as const,
    list: () => [...followerImportKeys.all, 'list'] as const,
    detail: (importId: string) => [...followerImportKeys.all, 'detail', importId] as const,
    latestComparison: () => [...followerImportKeys.all, 'latest-comparison'] as const,
};

/** ダッシュボードの比較要約（直近の取り込み vs 同じアカウント ID の前回）。null = 取り込みなし */
export const useLatestComparison = () =>
    useQuery({
        queryKey: followerImportKeys.latestComparison(),
        queryFn: getLatestComparisonSummary,
    });

/** 取り込み履歴（新しい順） */
export const useImports = () =>
    useQuery({
        queryKey: followerImportKeys.list(),
        queryFn: listImports,
    });

/** 取り込み詳細（差分 + 分析 + メンバー一覧）。null = 存在しない */
export const useImportDetail = (importId: string) =>
    useQuery({
        queryKey: followerImportKeys.detail(importId),
        queryFn: () => getImportDetail(importId),
    });

export const useUploadImport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: UploadImportInput) => uploadImport(input),
        onSuccess: async (result) => {
            if (result.success) await queryClient.invalidateQueries({ queryKey: followerImportKeys.all });
        },
    });
};

export const useDeleteImport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (importId: string) => deleteImport(importId),
        onSuccess: async (result) => {
            if (result.success) await queryClient.invalidateQueries({ queryKey: followerImportKeys.all });
        },
    });
};

/** 取り込みデータの全削除。成功後は一覧・詳細・ダッシュボードをまとめて再取得する */
export const useDeleteAllImports = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => deleteAllImports(),
        onSuccess: async (result) => {
            if (result.success) await queryClient.invalidateQueries({ queryKey: followerImportKeys.all });
        },
    });
};
