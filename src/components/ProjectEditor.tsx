import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/authStore";
import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Play, Loader2, ArrowLeft } from "lucide-react";

interface ProjectEditorProps {
  projectId?: string;
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const user = useStore($user);
  const [name, setName] = useState("");
  const [developConfig, setDevelopConfig] = useState("");
  const [stagingConfig, setStagingConfig] = useState("");
  const [productionConfig, setProductionConfig] = useState("");
  const [loading, setLoading] = useState(!!projectId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        const { data, error } = await supabaseClient.from("projects").select("*").eq("id", projectId).single();

        if (!error && data) {
          setName(data.name);
          setDevelopConfig(data.develop_config);
          setStagingConfig(data.staging_config);
          setProductionConfig(data.production_config);
        }
        setLoading(false);
      };
      fetchProject();
    }
  }, [projectId]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a project name");
      return;
    }

    setSaving(true);
    const projectData = {
      name,
      develop_config: developConfig,
      staging_config: stagingConfig,
      production_config: productionConfig,
      user_id: user?.id,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (projectId) {
      const { error: updateError } = await supabaseClient.from("projects").update(projectData).eq("id", projectId);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabaseClient.from("projects").insert(projectData).select().single();
      error = insertError;
      if (!error && data) {
        window.location.href = `/projects/${data.id}`;
      }
    }

    if (error) {
      alert("Error saving project: " + error.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => (window.location.href = "/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{projectId ? "Edit Project" : "New Project"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button disabled={saving || !projectId}>
            <Play className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Awesome App"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ConfigField
          label="Develop"
          value={developConfig}
          onChange={setDevelopConfig}
          placeholder="Paste Develop configuration here..."
        />
        <ConfigField
          label="Staging"
          value={stagingConfig}
          onChange={setStagingConfig}
          placeholder="Paste Staging configuration here..."
        />
        <ConfigField
          label="Production"
          value={productionConfig}
          onChange={setProductionConfig}
          placeholder="Paste Production configuration here..."
        />
      </div>
    </div>
  );
}

interface ConfigFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

function ConfigField({ label, value, onChange, placeholder }: ConfigFieldProps) {
  const charLimit = 10000;
  const isOverLimit = value.length > charLimit;
  const isNearLimit = value.length > charLimit * 0.9;

  return (
    <Card className={isOverLimit ? "border-destructive" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{label} Environment</CardTitle>
      </CardHeader>
      <CardContent>
        <textarea
          className="w-full h-64 p-3 text-sm font-mono bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div
          className={`mt-2 text-xs text-right ${
            isOverLimit ? "text-destructive font-bold" : isNearLimit ? "text-yellow-500" : "text-muted-foreground"
          }`}
        >
          {value.length.toLocaleString()} / {charLimit.toLocaleString()} chars
        </div>
      </CardContent>
    </Card>
  );
}
