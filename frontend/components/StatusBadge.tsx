import { cn } from "@/lib/utils";
import { CircleDot, CheckCircle2, CheckSquare, XCircle, AlertTriangle, XOctagon } from "lucide-react";

type ContractState = "OPEN" | "FIXED_EXACT" | "FIXED_EQUIVALENT" | "NOT_FIXED" | "INSUFFICIENT" | "CANCELED" | "PENDING_APPEAL";

interface StatusBadgeProps {
  state: ContractState;
  className?: string;
}

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const config = {
    OPEN: {
      label: "Open",
      icon: CircleDot,
      colors: "bg-state-open/10 text-state-open border-state-open",
    },
    FIXED_EXACT: {
      label: "Fixed (Exact)",
      icon: CheckCircle2,
      colors: "bg-state-exact/10 text-state-exact border-state-exact",
    },
    FIXED_EQUIVALENT: {
      label: "Fixed (Equivalent)",
      icon: CheckSquare,
      colors: "bg-state-equiv/10 text-state-equiv border-state-equiv",
    },
    NOT_FIXED: {
      label: "Not Fixed",
      icon: XCircle,
      colors: "bg-state-fail/10 text-state-fail border-state-fail",
    },
    INSUFFICIENT: {
      label: "Insufficient Info",
      icon: AlertTriangle,
      colors: "bg-state-fail/10 text-state-fail border-state-fail",
    },
    CANCELED: {
      label: "Canceled",
      icon: XOctagon,
      colors: "bg-lines/50 text-gray-400 border-lines",
    },
    PENDING_APPEAL: {
      label: "Pending Appeal",
      icon: AlertTriangle,
      colors: "bg-state-equiv/20 text-state-equiv border-state-equiv",
    }
  };

  const { label, icon: Icon, colors } = config[state] || config.OPEN;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 border text-xs font-bold font-mono uppercase tracking-wider transition-all duration-300 ease-in-out",
      (state === "OPEN" || state === "PENDING_APPEAL") ? "animate-pulse shadow-[0_0_10px_rgba(255,193,7,0.3)]" : "",
      colors, 
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}
