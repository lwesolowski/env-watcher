import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ReportTableProps {
  htmlContent: string;
}

export function ReportTable({ htmlContent }: ReportTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Comparison Report</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          className="overflow-x-auto p-6 prose prose-slate dark:prose-invert max-w-none 
            [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 
            [&_th]:bg-muted [&_tr:nth-child(even)]:bg-muted/50"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </CardContent>
    </Card>
  );
}
