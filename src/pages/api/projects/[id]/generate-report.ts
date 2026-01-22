import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";
import { OpenRouterService } from "../../../../lib/openrouter.service";
import { extractToken, authenticateUser } from "../../../../middleware/auth";
import { handleError } from "../../../../utils/errorHandler";
import { logger } from "../../../../utils/logger";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "astro:env/client";
import { OPENROUTER_API_KEY } from "astro:env/server";

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: "Project ID is required" }), { status: 400 });
    }

    const token = extractToken(request);
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const userId = await authenticateUser(token, supabase);
    logger.info("Authenticated user", { user_id: userId });

    // Fetch project data
    logger.info("Fetching project data", { project_id: id, user_id: userId });
    const { data: project, error: fetchError } = await supabase.from("projects").select("*").eq("id", id).single();

    if (fetchError) {
      logger.warn("Project not found", {
        project_id: id,
        error: fetchError?.message,
      });
      return new Response(JSON.stringify({ error: "Project not found (fetch error)" }), { status: 404 });
    }

    if (!project) {
      logger.warn("Project not found", {
        project_id: id,
        error: fetchError?.message,
      });
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
    }

    if (project.user_id !== userId) {
      logger.warn("Access denied for project", {
        project_id: id,
        user_id: userId,
        project_owner_id: project.user_id,
      });
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 });
    }

    const openRouterService = new OpenRouterService({
      apiKey: OPENROUTER_API_KEY,
    });

    const systemPrompt = `You are EnvWatcher AI, a specialist in DevOps and environment configuration analysis.
Your task is to compare configurations across three environments: Develop, Staging, and Production.

Input will be provided as three blocks of text.

Output must be a JSON object with two fields:
1. "report_html": A string containing an HTML table (only <table> tag and its content) comparing the environments.
   - The table MUST have columns: "Feature/Variable", "Develop", "Staging", "Production", and "Source Fragment".
   - "Source Fragment" should contain a short quote from the input that confirms the difference.
   - Use Tailwind CSS classes for styling if needed (e.g., for highlighting differences).
2. "recommendations_html": A string containing HTML (e.g., <ul> or <div> with <p>) with recommendations.
   - Even if there are no differences, suggest improvements like library updates or security best practices based on your knowledge cutoff.

BE CONCISE. Focus on differences and critical recommendations. Output ONLY valid JSON.`;

    const userPrompt = `Develop Environment:
${project.develop_config}

Staging Environment:
${project.staging_config}

Production Environment:
${project.production_config}`;

    logger.info("Generating AI report for project", { project_id: id, user_id: userId });

    const result = await openRouterService.completeChat<{
      report_html: string;
      recommendations_html: string;
    }>({
      systemPrompt,
      userPrompt,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "report",
          strict: true,
          schema: {
            type: "object",
            properties: {
              report_html: { type: "string" },
              recommendations_html: { type: "string" },
            },
            required: ["report_html", "recommendations_html"],
            additionalProperties: false,
          },
        },
      },
    });

    // Save report to database
    const { error: insertError } = await supabase.from("reports").insert({
      project_id: id,
      diff_html: result.report_html,
      recommendations: result.recommendations_html,
    });

    if (insertError) {
      logger.error("Error saving report to database", { error: insertError.message, project_id: id });
      throw insertError;
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Error generating report", { error: error instanceof Error ? error.message : "Unknown error" });
    return handleError(error);
  }
};
