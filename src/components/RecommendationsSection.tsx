import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";

interface Recommendation {
  priority: "high" | "medium" | "low";
  text: string;
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
}

export function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  const getIcon = (priority: Recommendation["priority"]) => {
    switch (priority) {
      case "high": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "medium": return <Info className="h-4 w-4 text-yellow-500" />;
      case "low": return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className="flex gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="mt-0.5">{getIcon(rec.priority)}</div>
                <p className="text-sm">{rec.text}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">No recommendations at this time.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
