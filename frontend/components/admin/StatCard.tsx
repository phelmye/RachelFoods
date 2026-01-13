'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
    loading?: boolean;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    className,
    loading = false,
}: StatCardProps) {
    if (loading) {
        return (
            <div className={cn('bg-background border border-border rounded-lg p-6', className)}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('bg-background border border-border rounded-lg p-6 hover:shadow-md transition-shadow', className)}>
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
                {icon && <div className="text-2xl">{icon}</div>}
            </div>

            <div className="mb-2">
                <p className="text-3xl font-bold text-foreground">{value}</p>
            </div>

            <div className="flex items-center gap-2">
                {subtitle && (
                    <p className="text-sm text-foreground/60">{subtitle}</p>
                )}
                {trend && (
                    <span
                        className={cn(
                            'text-xs font-medium px-2 py-1 rounded-full',
                            trend.isPositive
                                ? 'bg-success/10 text-success'
                                : 'bg-error/10 text-error'
                        )}
                    >
                        {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </span>
                )}
            </div>
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-background border border-border rounded-lg p-6">
            <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
            </div>
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-foreground/60 mb-6 max-w-md">{description}</p>
            {action}
        </div>
    );
}
