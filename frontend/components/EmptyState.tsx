"use client";

import { AlertTriangle, XCircle, SearchX } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  type?: "error" | "empty" | "wrong-network";
}

export default function EmptyState({ title, description, type = "empty" }: EmptyStateProps) {
  const Icon = type === "error" ? XCircle : type === "wrong-network" ? AlertTriangle : SearchX;
  const colorClass = type === "error" ? "text-state-fail border-state-fail/30 bg-state-fail/5" 
    : type === "wrong-network" ? "text-state-open border-state-open/30 bg-state-open/5" 
    : "text-gray-400 border-lines bg-surface/50";

  return (
    <div className={`flex flex-col items-center justify-center p-12 border text-center ${colorClass}`}>
      <Icon className="w-12 h-12 mb-4" />
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm font-mono opacity-80 max-w-md">{description}</p>
    </div>
  );
}
