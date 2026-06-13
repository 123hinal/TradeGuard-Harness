import Link from "next/link";
import { Shield } from "lucide-react";

const navItems = [
  { href: "/", label: "Submit Trade" },
  { href: "/dashboard", label: "Decision Dashboard" },
  { href: "/audit", label: "Audit Dashboard" },
];

export function AppNav() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6 text-primary" />
          TradeGuard AI Harness
        </Link>
        <nav className="flex gap-4 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
