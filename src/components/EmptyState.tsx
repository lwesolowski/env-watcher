import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Play } from 'lucide-react';

interface EmptyStateProps {
  onLoadDemo: () => void;
  onCreateNew: () => void;
}

export function EmptyState({ onLoadDemo, onCreateNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to EnvWatcher</CardTitle>
          <CardDescription className="text-base mt-2">
            You don't have any projects yet. Start by creating your first project or check out the demo to see how it works.
          </CardDescription>
        </CardHeader>
        <div className="px-6 py-4 space-y-4">
          <ul className="text-left space-y-2 list-disc list-inside text-muted-foreground">
            <li>Compare configurations between Develop, Staging, and Production.</li>
            <li>Use AI to detect differences and potential issues.</li>
            <li>Get recommendations for library updates and best practices.</li>
            <li>Mitchell source fragments to avoid hallucinations.</li>
          </ul>
        </div>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" asChild className="flex items-center gap-2">
            <a href="/projects/demo">
              <Play className="h-4 w-4" />
              View Demo
            </a>
          </Button>
          <Button onClick={onCreateNew} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create New Project
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
