import { cn } from "@/lib/utils";

interface ScaleBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  colorClass?: string;
}

export function ScaleBar({ 
  value, 
  max = 5, 
  label, 
  showValue = true,
  size = "md",
  colorClass = "bg-primary"
}: ScaleBarProps) {
  const percentage = (value / max) * 100;
  
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className={cn(
          "text-muted-foreground shrink-0",
          size === "sm" ? "text-xs w-24" : "text-sm w-32"
        )}>
          {label}
        </span>
      )}
      <div className={cn(
        "flex-1 rounded-full bg-secondary overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2"
      )}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className={cn(
          "font-medium shrink-0",
          size === "sm" ? "text-xs w-6" : "text-sm w-8"
        )}>
          {value}/{max}
        </span>
      )}
    </div>
  );
}

interface ScaleDotsProps {
  value: number;
  max?: number;
  label?: string;
  activeColor?: string;
}

export function ScaleDots({ 
  value, 
  max = 5, 
  label,
  activeColor = "bg-primary"
}: ScaleDotsProps) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-sm text-muted-foreground w-32 shrink-0">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-colors",
              i < value ? activeColor : "bg-secondary"
            )}
          />
        ))}
      </div>
    </div>
  );
}
