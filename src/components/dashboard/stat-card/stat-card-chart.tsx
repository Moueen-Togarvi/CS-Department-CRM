"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatCardHoverState {
  value: number | null;
  label: string | null;
  trend: number | null;
}

export const statCardValueClassName =
  "text-2xl font-bold leading-none tracking-tight";

export const statCardLabelClassName = "mt-0 text-[11px]";

export const statCardChartHeights = {
  xs: "[--stat-card-chart-h:56px]",
  sm: "[--stat-card-chart-h:96px]",
  md: "[--stat-card-chart-h:190px]",
  lg: "[--stat-card-chart-h:420px]",
} as const;

/** Bleeds charts edge-to-edge inside stat card content padding. */
export function StatCardChart({
  children,
  className,
  size = "sm",
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof statCardChartHeights;
}) {
  return (
    <div
      className={cn(
        "relative -mx-3 -mb-2 overflow-hidden",
        "[&_.relative.w-full]:aspect-auto! [&_.relative.w-full]:h-[var(--stat-card-chart-h)]!",
        statCardChartHeights[size],
        className
      )}
    >
      {children}
    </div>
  );
}
