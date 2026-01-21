/**
 * Configuration comparison utilities
 */

import { parseConfigText, normalizeVersion, compareVersions, extractVersions } from "./config-parser";

export type Priority = "high" | "medium" | "low";

export interface ConfigDifference {
  key: string;
  develop: string;
  staging: string;
  production: string;
  sourceFragment: string;
  priority: Priority;
}

export interface ComparisonResult {
  differences: ConfigDifference[];
  hasDifferences: boolean;
}

/**
 * Determines priority based on version differences
 * High: Production < Staging/Develop (outdated prod)
 * Medium: Inconsistency across environments
 * Low: Minor differences
 */
function determinePriority(key: string, develop: string, staging: string, production: string): Priority {
  const isVersion = /^\d+\.\d+/.test(develop) || /^\d+\.\d+/.test(staging) || /^\d+\.\d+/.test(production);

  if (isVersion) {
    try {
      const devVer = compareVersions(develop || "0.0.0", production || "0.0.0");
      const stgVer = compareVersions(staging || "0.0.0", production || "0.0.0");

      // Production is behind (outdated) - HIGH priority
      if (devVer > 0 || stgVer > 0) {
        return "high";
      }

      // Production is ahead but inconsistent - MEDIUM priority
      if (develop !== staging || develop !== production) {
        return "medium";
      }
    } catch {
      return "medium";
    }
  }

  // Non-version differences - LOW priority
  return "low";
}

/**
 * Generates source fragment from original text
 */
function generateSourceFragment(key: string, value: string, maxLength: number = 50): string {
  const fragment = `${key}: ${value}`;
  if (fragment.length > maxLength) {
    return fragment.substring(0, maxLength) + "...";
  }
  return fragment;
}

/**
 * Compares three environment configurations and returns differences
 */
export function compareConfigs(
  developText: string,
  stagingText: string,
  productionText: string
): ComparisonResult {
  const developConfig = parseConfigText(developText);
  const stagingConfig = parseConfigText(stagingText);
  const productionConfig = parseConfigText(productionText);

  const differences: ConfigDifference[] = [];
  const allKeys = new Set([
    ...Object.keys(developConfig),
    ...Object.keys(stagingConfig),
    ...Object.keys(productionConfig),
  ]);

  for (const key of allKeys) {
    const devValue = developConfig[key] || "";
    const stgValue = stagingConfig[key] || "";
    const prodValue = productionConfig[key] || "";

    // Check if there are differences
    if (devValue !== stgValue || devValue !== prodValue || stgValue !== prodValue) {
      const priority = determinePriority(key, devValue, stgValue, prodValue);
      const sourceFragment = generateSourceFragment(key, prodValue || stgValue || devValue);

      differences.push({
        key,
        develop: devValue,
        staging: stgValue,
        production: prodValue,
        sourceFragment,
        priority,
      });
    }
  }

  // Sort by priority (high -> medium -> low)
  differences.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    differences,
    hasDifferences: differences.length > 0,
  };
}

/**
 * Filters differences by priority
 */
export function filterDifferencesByPriority(differences: ConfigDifference[], priority: Priority): ConfigDifference[] {
  return differences.filter((diff) => diff.priority === priority);
}

/**
 * Checks if production environment is outdated (has lower versions)
 */
export function isProductionOutdated(differences: ConfigDifference[]): boolean {
  return differences.some((diff) => diff.priority === "high");
}

/**
 * Gets summary statistics of differences
 */
export function getDifferenceSummary(differences: ConfigDifference[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    total: differences.length,
    high: filterDifferencesByPriority(differences, "high").length,
    medium: filterDifferencesByPriority(differences, "medium").length,
    low: filterDifferencesByPriority(differences, "low").length,
  };
}

/**
 * Extracts version-specific differences
 */
export function getVersionDifferences(developText: string, stagingText: string, productionText: string): ConfigDifference[] {
  const developConfig = parseConfigText(developText);
  const stagingConfig = parseConfigText(stagingText);
  const productionConfig = parseConfigText(productionText);

  const developVersions = extractVersions(developConfig);
  const stagingVersions = extractVersions(stagingConfig);
  const productionVersions = extractVersions(productionConfig);

  const allVersionKeys = new Set([
    ...Object.keys(developVersions),
    ...Object.keys(stagingVersions),
    ...Object.keys(productionVersions),
  ]);

  const differences: ConfigDifference[] = [];

  for (const key of allVersionKeys) {
    const devValue = developVersions[key] || "";
    const stgValue = stagingVersions[key] || "";
    const prodValue = productionVersions[key] || "";

    if (devValue !== stgValue || devValue !== prodValue || stgValue !== prodValue) {
      const priority = determinePriority(key, devValue, stgValue, prodValue);
      const sourceFragment = generateSourceFragment(key, prodValue || stgValue || devValue);

      differences.push({
        key,
        develop: devValue,
        staging: stgValue,
        production: prodValue,
        sourceFragment,
        priority,
      });
    }
  }

  return differences;
}
