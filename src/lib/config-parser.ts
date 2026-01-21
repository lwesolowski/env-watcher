/**
 * Configuration parsing and normalization utilities
 */

export interface ParsedConfig {
  [key: string]: string;
}

/**
 * Extracts key-value pairs from configuration text
 * Supports multiple formats: KEY=VALUE, KEY: VALUE, KEY VALUE
 */
export function parseConfigText(text: string): ParsedConfig {
  const config: ParsedConfig = {};
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    // Match KEY=VALUE
    let match = trimmed.match(/^([^=:]+?)=(.+)$/);
    if (match) {
      config[match[1].trim().toLowerCase()] = match[2].trim();
      continue;
    }

    // Match KEY: VALUE (YAML-like)
    match = trimmed.match(/^([^:]+?):(.+)$/);
    if (match) {
      config[match[1].trim().toLowerCase()] = match[2].trim();
      continue;
    }

    // Match KEY VALUE (space-separated)
    match = trimmed.match(/^(\S+)\s+(.+)$/);
    if (match) {
      config[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }

  return config;
}

/**
 * Normalizes version string for comparison
 * Examples:
 * - "16.15.0" -> "16.15.0"
 * - "v16.15" -> "16.15.0"
 * - "16.15" -> "16.15.0"
 * - "2023-08-01" -> "2023-08-01" (date format preserved)
 */
export function normalizeVersion(version: string): string {
  // Remove leading 'v' or 'V'
  let normalized = version.replace(/^v/i, "");

  // Check if it's a date format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  // Split by dots and ensure 3 parts (major.minor.patch)
  const parts = normalized.split(".");
  while (parts.length < 3) {
    parts.push("0");
  }

  return parts.slice(0, 3).join(".");
}

/**
 * Compares two semver versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const n1 = normalizeVersion(v1);
  const n2 = normalizeVersion(v2);

  // Handle date format comparison
  if (/^\d{4}-\d{2}-\d{2}$/.test(n1) && /^\d{4}-\d{2}-\d{2}$/.test(n2)) {
    return n1.localeCompare(n2);
  }

  const parts1 = n1.split(".").map(Number);
  const parts2 = n2.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] < parts2[i]) return -1;
    if (parts1[i] > parts2[i]) return 1;
  }

  return 0;
}

/**
 * Extracts version information from parsed config
 */
export function extractVersions(config: ParsedConfig): Record<string, string> {
  const versions: Record<string, string> = {};
  const versionKeys = ["node", "nodejs", "postgres", "postgresql", "redis", "python", "java", "stripe_api_version"];

  for (const [key, value] of Object.entries(config)) {
    const lowerKey = key.toLowerCase();
    if (versionKeys.some((vk) => lowerKey.includes(vk))) {
      versions[key] = value;
    }
  }

  return versions;
}

/**
 * Normalizes configuration text by parsing and reformatting
 */
export function normalizeConfig(text: string): ParsedConfig {
  const parsed = parseConfigText(text);
  const normalized: ParsedConfig = {};

  for (const [key, value] of Object.entries(parsed)) {
    // Attempt to normalize version-like values
    if (/^\d+\.\d+/.test(value) || /^v?\d+\.\d+/.test(value)) {
      normalized[key] = normalizeVersion(value);
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}
