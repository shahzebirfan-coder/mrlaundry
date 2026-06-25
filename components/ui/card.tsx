"use client";

import { cn } from "@/lib/utils";
import { ReactNode, MouseEventHandler } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card",
        hover && "hover:-translate-y-1 hover:shadow-glass-lg cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex items-start justify-between", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("font-semibold text-lg", className)}>{children}</h3>;
}

export function CardSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-slate-500 dark:text-slate-400 mt-0.5", className)}>{children}</p>;
}
