import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $user, $authLoading } from "@/lib/authStore";
import { supabaseClient } from "@/db/supabase.client";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Loader2 } from "lucide-react";
import type { Database } from "@/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function ProjectDashboard() {
  const user = useStore($user);
  const authLoading = useStore($authLoading);
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setProjects(data);
      }
    } catch (err) {
      console.error("fetchProjects: exception", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [user, authLoading]);

  const handleCreateNew = () => {
    window.location.href = '/projects/new';
  };

  const handleEdit = (id: string) => {
    window.location.href = `/projects/${id}`;
  };

  const handleDelete = async (id: string, name: string) => {
    // For MVP, we use simple confirm. Plan mentioned AlertDialog, but for speed let's start simple
    if (confirm(`Are you sure you want to delete project "${name}"? This action cannot be undone.`)) {
      setActionLoading(true);
      const { error } = await supabaseClient
        .from('projects')
        .delete()
        .eq('id', id);

      if (!error) {
        setProjects(projects.filter(p => p.id !== id));
      }
      setActionLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    if (!user) return;
    
    setActionLoading(true);
    const demoProject = {
      user_id: user.id,
      name: 'DEMO Project (E-commerce App)',
      develop_config: 'node: 18.1.0\npostgres: 14.1\nredis: 6.2\nstripe_api_version: 2022-11-15',
      staging_config: 'node: 18.1.0\npostgres: 14.1\nredis: 6.2\nstripe_api_version: 2022-11-15',
      production_config: 'node: 16.15.0\npostgres: 12.8\nredis: 6.0\nstripe_api_version: 2020-08-27',
      status: 'draft' as const
    };

    const { data, error } = await supabaseClient
      .from('projects')
      .insert(demoProject)
      .select()
      .single();

    if (!error && data) {
      setProjects([data, ...projects]);
    }
    setActionLoading(false);
  };

  if (authLoading) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <div className="py-8 space-y-6" />;
  }

  if (!user) {
    return (
      <div className="py-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Please log in</h1>
        <p className="text-muted-foreground mb-8">You need to be logged in to view your projects.</p>
        <Button onClick={() => window.location.href = '/login'}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (loading && projects.length === 0) {
    return (
      <div className="py-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
          <p className="text-muted-foreground">Manage and analyze your environment configurations.</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Create New Project
        </Button>
      </div>

      {actionLoading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState onLoadDemo={handleLoadDemo} onCreateNew={handleCreateNew} />
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
