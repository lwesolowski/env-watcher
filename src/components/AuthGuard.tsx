import React from "react";
import { useStore } from "@nanostores/react";
import { $user, $authLoading } from "@/lib/authStore";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const user = useStore($user);
  const loading = useStore($authLoading);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mounted) {
    return <div className="flex items-center justify-center py-12" />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Authentication required</h2>
        <p className="text-muted-foreground mt-2">Please login to access this page.</p>
        <a href="/login" className="mt-4 inline-block text-primary hover:underline">
          Go to Login
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
