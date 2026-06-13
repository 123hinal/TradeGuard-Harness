import { Suspense } from "react";
import DecisionDashboard from "./decision-dashboard";

export default function DecisionDashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading decision...</p>}>
      <DecisionDashboard />
    </Suspense>
  );
}
