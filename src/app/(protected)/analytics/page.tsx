"use client";

import { Card } from "@/src/components/ui/card";
import BusinessAnalytics from "@/src/app/(protected)/_components/analytics/business/business-analytics";

const AnalyticsPage = () => {
  return (
    <Card className="w-[100%] rounded-none">
      <BusinessAnalytics />
    </Card>
  );
};

export default AnalyticsPage;
