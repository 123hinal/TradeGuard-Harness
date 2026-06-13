import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "secondary";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          default: "bg-primary/10 text-primary",
          success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
          warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
          danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
          secondary: "bg-secondary text-secondary-foreground",
        }[variant],
        className
      )}
      {...props}
    />
  );
}
