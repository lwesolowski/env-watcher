import { describe, it, expect } from "vitest";
import {
  compareConfigs,
  filterDifferencesByPriority,
  isProductionOutdated,
  getDifferenceSummary,
  getVersionDifferences,
  type ConfigDifference,
} from "../lib/config-comparator";

describe("Configuration Comparison", () => {
  describe("compareConfigs", () => {
    it("should detect no differences when all configs are identical", () => {
      const config = "node=16.15.0\nredis=7.0.5";
      const result = compareConfigs(config, config, config);

      expect(result.hasDifferences).toBe(false);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect differences between environments", () => {
      const develop = "node=18.0.0";
      const staging = "node=18.0.0";
      const production = "node=16.15.0";

      const result = compareConfigs(develop, staging, production);

      expect(result.hasDifferences).toBe(true);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].key).toBe("node");
      expect(result.differences[0].develop).toBe("18.0.0");
      expect(result.differences[0].staging).toBe("18.0.0");
      expect(result.differences[0].production).toBe("16.15.0");
    });

    it("should assign HIGH priority when production is outdated", () => {
      const develop = "node=18.0.0";
      const staging = "node=18.0.0";
      const production = "node=16.15.0";

      const result = compareConfigs(develop, staging, production);

      expect(result.differences[0].priority).toBe("high");
    });

    it("should assign MEDIUM priority for version inconsistencies", () => {
      const develop = "node=18.0.0";
      const staging = "node=17.0.0";
      const production = "node=19.0.0";

      const result = compareConfigs(develop, staging, production);

      expect(result.differences[0].priority).toBe("medium");
    });

    it("should assign LOW priority for non-version differences", () => {
      const develop = "app_name=MyApp-Dev";
      const staging = "app_name=MyApp-Staging";
      const production = "app_name=MyApp-Prod";

      const result = compareConfigs(develop, staging, production);

      expect(result.differences[0].priority).toBe("low");
    });

    it("should sort differences by priority (high -> medium -> low)", () => {
      const develop = "node=18.0.0\nredis=7.0.0\napp_name=Dev";
      const staging = "node=18.0.0\nredis=6.5.0\napp_name=Staging";
      const production = "node=16.0.0\nredis=7.5.0\napp_name=Prod";

      const result = compareConfigs(develop, staging, production);

      expect(result.differences[0].priority).toBe("high"); // node: production outdated
      expect(result.differences[result.differences.length - 1].priority).toBe("low"); // app_name
    });

    it("should generate source fragments", () => {
      const develop = "node=18.0.0";
      const staging = "node=18.0.0";
      const production = "node=16.15.0";

      const result = compareConfigs(develop, staging, production);

      expect(result.differences[0].sourceFragment).toContain("node");
      expect(result.differences[0].sourceFragment).toContain("16.15.0");
    });

    it("should handle missing keys in some environments", () => {
      const develop = "node=18.0.0\nredis=7.0.0";
      const staging = "node=18.0.0";
      const production = "node=18.0.0\npostgres=14.5";

      const result = compareConfigs(develop, staging, production);

      expect(result.hasDifferences).toBe(true);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("should handle empty configs", () => {
      const result = compareConfigs("", "", "");

      expect(result.hasDifferences).toBe(false);
      expect(result.differences).toHaveLength(0);
    });

    it("should handle configs with comments", () => {
      const develop = "# Development\nnode=18.0.0";
      const staging = "# Staging\nnode=18.0.0";
      const production = "# Production\nnode=16.15.0";

      const result = compareConfigs(develop, staging, production);

      expect(result.hasDifferences).toBe(true);
      expect(result.differences).toHaveLength(1);
    });

    it("should handle multiple differences", () => {
      const develop = "node=18.0.0\nredis=7.0.0\npostgres=15.0";
      const staging = "node=17.0.0\nredis=7.0.0\npostgres=14.0";
      const production = "node=16.0.0\nredis=6.0.0\npostgres=14.0";

      const result = compareConfigs(develop, staging, production);

      expect(result.differences.length).toBeGreaterThanOrEqual(2);
    });

    it("should truncate long source fragments", () => {
      const longValue = "a".repeat(100);
      const develop = `key=${longValue}`;
      const staging = `key=${longValue}`;
      const production = `key=different`;

      const result = compareConfigs(develop, staging, production);

      expect(result.differences[0].sourceFragment.length).toBeLessThanOrEqual(53); // 50 + "..."
    });
  });

  describe("filterDifferencesByPriority", () => {
    const mockDifferences: ConfigDifference[] = [
      {
        key: "node",
        develop: "18.0.0",
        staging: "18.0.0",
        production: "16.0.0",
        sourceFragment: "node: 16.0.0",
        priority: "high",
      },
      {
        key: "redis",
        develop: "7.0.0",
        staging: "6.5.0",
        production: "7.5.0",
        sourceFragment: "redis: 7.5.0",
        priority: "medium",
      },
      {
        key: "app_name",
        develop: "Dev",
        staging: "Staging",
        production: "Prod",
        sourceFragment: "app_name: Prod",
        priority: "low",
      },
    ];

    it("should filter high priority differences", () => {
      const result = filterDifferencesByPriority(mockDifferences, "high");
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe("high");
    });

    it("should filter medium priority differences", () => {
      const result = filterDifferencesByPriority(mockDifferences, "medium");
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe("medium");
    });

    it("should filter low priority differences", () => {
      const result = filterDifferencesByPriority(mockDifferences, "low");
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe("low");
    });

    it("should return empty array when no matches", () => {
      const result = filterDifferencesByPriority([], "high");
      expect(result).toHaveLength(0);
    });
  });

  describe("isProductionOutdated", () => {
    it("should return true when production is outdated", () => {
      const differences: ConfigDifference[] = [
        {
          key: "node",
          develop: "18.0.0",
          staging: "18.0.0",
          production: "16.0.0",
          sourceFragment: "node: 16.0.0",
          priority: "high",
        },
      ];

      expect(isProductionOutdated(differences)).toBe(true);
    });

    it("should return false when production is up to date", () => {
      const differences: ConfigDifference[] = [
        {
          key: "app_name",
          develop: "Dev",
          staging: "Staging",
          production: "Prod",
          sourceFragment: "app_name: Prod",
          priority: "low",
        },
      ];

      expect(isProductionOutdated(differences)).toBe(false);
    });

    it("should return false for empty differences", () => {
      expect(isProductionOutdated([])).toBe(false);
    });
  });

  describe("getDifferenceSummary", () => {
    it("should return correct summary statistics", () => {
      const differences: ConfigDifference[] = [
        {
          key: "node",
          develop: "18.0.0",
          staging: "18.0.0",
          production: "16.0.0",
          sourceFragment: "node: 16.0.0",
          priority: "high",
        },
        {
          key: "redis",
          develop: "7.0.0",
          staging: "6.5.0",
          production: "7.5.0",
          sourceFragment: "redis: 7.5.0",
          priority: "medium",
        },
        {
          key: "postgres",
          develop: "15.0.0",
          staging: "14.5.0",
          production: "15.0.0",
          sourceFragment: "postgres: 15.0.0",
          priority: "medium",
        },
        {
          key: "app_name",
          develop: "Dev",
          staging: "Staging",
          production: "Prod",
          sourceFragment: "app_name: Prod",
          priority: "low",
        },
      ];

      const summary = getDifferenceSummary(differences);

      expect(summary.total).toBe(4);
      expect(summary.high).toBe(1);
      expect(summary.medium).toBe(2);
      expect(summary.low).toBe(1);
    });

    it("should return zeros for empty differences", () => {
      const summary = getDifferenceSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.high).toBe(0);
      expect(summary.medium).toBe(0);
      expect(summary.low).toBe(0);
    });
  });

  describe("getVersionDifferences", () => {
    it("should extract only version-related differences", () => {
      const develop = "node=18.0.0\napp_name=Dev\nredis=7.0.0";
      const staging = "node=18.0.0\napp_name=Staging\nredis=7.0.0";
      const production = "node=16.0.0\napp_name=Prod\nredis=6.0.0";

      const result = getVersionDifferences(develop, staging, production);

      expect(result.length).toBe(2); // node and redis, not app_name
      expect(result.some((diff) => diff.key === "app_name")).toBe(false);
    });

    it("should return empty array when no version differences", () => {
      const config = "node=18.0.0\nredis=7.0.0";
      const result = getVersionDifferences(config, config, config);

      expect(result).toHaveLength(0);
    });

    it("should handle stripe_api_version", () => {
      const develop = "stripe_api_version=2024-01-01";
      const staging = "stripe_api_version=2024-01-01";
      const production = "stripe_api_version=2023-08-01";

      const result = getVersionDifferences(develop, staging, production);

      expect(result).toHaveLength(1);
      expect(result[0].key).toContain("stripe_api_version");
    });

    it("should handle empty configs", () => {
      const result = getVersionDifferences("", "", "");
      expect(result).toHaveLength(0);
    });
  });
});
