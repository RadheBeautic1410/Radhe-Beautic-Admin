import { Card, CardContent } from "@/src/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <Card className="rounded-none w-full h-full">
      <CardContent className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading online sale details...</span>
      </CardContent>
    </Card>
  );
}
