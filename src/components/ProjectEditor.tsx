import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/authStore";
import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Play, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

interface ProjectEditorProps {
  projectId?: string;
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const user = useStore($user);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [developConfig, setDevelopConfig] = useState("");
  const [stagingConfig, setStagingConfig] = useState("");
  const [productionConfig, setProductionConfig] = useState("");
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [recommendationsHtml, setRecommendationsHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Draft");
  const [loading, setLoading] = useState(!!projectId);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (projectId) {
      const fetchProject = async () => {
        const { data, error } = await supabaseClient.from("projects").select("*").eq("id", projectId).single();

        if (!error && data) {
          setName(data.name);
          setDevelopConfig(data.develop_config);
          setStagingConfig(data.staging_config);
          setProductionConfig(data.production_config);
          setReportHtml(data.report_html);
          setRecommendationsHtml(data.recommendations_html);
          setStatus(data.status || "Draft");
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
    return !error;
  };

  const handleGenerateReport = async () => {
    if (!projectId) {
      const saved = await handleSave();
      if (!saved) return;
    }

    setIsGenerating(true);
    try {
      const session = await supabaseClient.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/projects/${projectId}/generate-report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const { data } = await response.json();
      setReportHtml(data.report_html);
      setRecommendationsHtml(data.recommendations_html);

      // Smooth scroll to report
      setTimeout(() => {
        document.getElementById("report-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      alert("Error generating report: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptReport = async () => {
    if (!projectId) return;

    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from("projects")
        .update({ status: "Verified", updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (error) throw error;
      setStatus("Verified");
      alert("Report accepted and project verified!");
    } catch (error) {
      alert("Error accepting report: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-64" />;
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
          <Button variant="outline" onClick={handleSave} disabled={saving || isGenerating}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handleGenerateReport} disabled={saving || isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {reportHtml ? "Regenerate Report" : "Generate Report"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>General Information</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className={`text-sm font-bold ${status === "Verified" ? "text-green-500" : "text-yellow-500"}`}>
              {status}
            </span>
          </div>
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

      {isGenerating && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Analyzing Configurations...</h3>
              <p className="text-sm text-muted-foreground">
                Our AI is comparing your environments. This may take up to 15 seconds.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(reportHtml || recommendationsHtml) && !isGenerating && (
        <div id="report-section" className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Analysis Results</h2>
            {status !== "Verified" && (
              <Button onClick={handleAcceptReport} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Report
              </Button>
            )}
          </div>

          {reportHtml && (
            <Card>
              <CardHeader>
                <CardTitle>Comparison Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="overflow-x-auto prose prose-sm dark:prose-invert max-w-none 
                  [&>table]:w-full [&>table]:border-collapse [&>table]:border 
                  [&>table_th]:border [&>table_th]:p-2 [&>table_th]:bg-muted
                  [&>table_td]:border [&>table_td]:p-2"
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />
              </CardContent>
            </Card>
          )}

          {recommendationsHtml && (
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: recommendationsHtml }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
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
