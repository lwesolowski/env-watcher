import { describe, it, expect } from "vitest";
import {
  parseConfigText,
  normalizeVersion,
  compareVersions,
  extractVersions,
  normalizeConfig,
} from "../lib/config-parser";

describe("Configuration Parsing and Normalization", () => {
  describe("parseConfigText", () => {
    it("should parse KEY=VALUE format", () => {
      const text = "NODE_VERSION=16.15.0\nREDIS_VERSION=7.0.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node_version: "16.15.0",
        redis_version: "7.0.5",
      });
    });

    it("should parse KEY: VALUE format (YAML-like)", () => {
      const text = "node: 16.15.0\nredis: 7.0.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.5",
      });
    });

    it("should parse KEY VALUE format (space-separated)", () => {
      const text = "node 16.15.0\nredis 7.0.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.5",
      });
    });

    it("should ignore empty lines", () => {
      const text = "node=16.15.0\n\n\nredis=7.0.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.5",
      });
    });

    it("should ignore comments starting with #", () => {
      const text = "# This is a comment\nnode=16.15.0\n# Another comment\nredis=7.0.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.5",
      });
    });

    it("should ignore comments starting with //", () => {
      const text = "// This is a comment\nnode=16.15.0\nredis=7.0.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.5",
      });
    });

    it("should trim whitespace from keys and values", () => {
      const text = "  node  =  16.15.0  \n  redis  =  7.0.5  ";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.5",
      });
    });

    it("should handle mixed formats", () => {
      const text = "NODE_VERSION=16.15.0\nredis: 7.0.5\npostgres 14.5";
      const result = parseConfigText(text);
      expect(result).toEqual({
        node_version: "16.15.0",
        redis: "7.0.5",
        postgres: "14.5",
      });
    });

    it("should convert keys to lowercase", () => {
      const text = "NODE_VERSION=16.15.0\nNode=18.0.0";
      const result = parseConfigText(text);
      expect(result["node_version"]).toBe("16.15.0");
      expect(result["node"]).toBe("18.0.0");
    });

    it("should handle values with spaces", () => {
      const text = "description=My awesome app\nurl: https://example.com/path";
      const result = parseConfigText(text);
      expect(result.description).toBe("My awesome app");
      expect(result.url).toBe("https://example.com/path");
    });

    it("should return empty object for empty text", () => {
      const result = parseConfigText("");
      expect(result).toEqual({});
    });

    it("should return empty object for text with only comments", () => {
      const text = "# Comment 1\n// Comment 2\n# Comment 3";
      const result = parseConfigText(text);
      expect(result).toEqual({});
    });
  });

  describe("normalizeVersion", () => {
    it("should normalize version with leading v", () => {
      expect(normalizeVersion("v16.15.0")).toBe("16.15.0");
      expect(normalizeVersion("V16.15.0")).toBe("16.15.0");
    });

    it("should add missing patch version", () => {
      expect(normalizeVersion("16.15")).toBe("16.15.0");
    });

    it("should add missing minor and patch versions", () => {
      expect(normalizeVersion("16")).toBe("16.0.0");
    });

    it("should keep full version unchanged", () => {
      expect(normalizeVersion("16.15.0")).toBe("16.15.0");
    });

    it("should handle version with more than 3 parts", () => {
      expect(normalizeVersion("16.15.0.1")).toBe("16.15.0");
    });

    it("should preserve date format (YYYY-MM-DD)", () => {
      expect(normalizeVersion("2023-08-01")).toBe("2023-08-01");
      expect(normalizeVersion("2024-01-15")).toBe("2024-01-15");
    });

    it("should handle date format with leading v", () => {
      expect(normalizeVersion("v2023-08-01")).toBe("2023-08-01");
    });
  });

  describe("compareVersions", () => {
    it("should return 0 for equal versions", () => {
      expect(compareVersions("16.15.0", "16.15.0")).toBe(0);
      expect(compareVersions("16.15", "16.15.0")).toBe(0);
      expect(compareVersions("v16.15.0", "16.15.0")).toBe(0);
    });

    it("should return -1 when first version is lower", () => {
      expect(compareVersions("16.14.0", "16.15.0")).toBe(-1);
      expect(compareVersions("16.15.0", "17.0.0")).toBe(-1);
      expect(compareVersions("15.0.0", "16.0.0")).toBe(-1);
    });

    it("should return 1 when first version is higher", () => {
      expect(compareVersions("16.16.0", "16.15.0")).toBe(1);
      expect(compareVersions("17.0.0", "16.15.0")).toBe(1);
      expect(compareVersions("16.0.0", "15.0.0")).toBe(1);
    });

    it("should compare major version correctly", () => {
      expect(compareVersions("17.0.0", "16.99.99")).toBe(1);
      expect(compareVersions("16.0.0", "17.0.0")).toBe(-1);
    });

    it("should compare minor version correctly", () => {
      expect(compareVersions("16.16.0", "16.15.99")).toBe(1);
      expect(compareVersions("16.15.0", "16.16.0")).toBe(-1);
    });

    it("should compare patch version correctly", () => {
      expect(compareVersions("16.15.1", "16.15.0")).toBe(1);
      expect(compareVersions("16.15.0", "16.15.1")).toBe(-1);
    });

    it("should handle versions with leading v", () => {
      expect(compareVersions("v16.15.0", "v16.15.0")).toBe(0);
      expect(compareVersions("v16.15.0", "v16.14.0")).toBe(1);
    });

    it("should compare date format versions", () => {
      expect(compareVersions("2023-08-01", "2023-08-01")).toBe(0);
      expect(compareVersions("2023-08-01", "2023-07-01")).toBe(1);
      expect(compareVersions("2023-08-01", "2024-08-01")).toBe(-1);
    });
  });

  describe("extractVersions", () => {
    it("should extract node version", () => {
      const config = { node: "16.15.0", other: "value" };
      const versions = extractVersions(config);
      expect(versions).toEqual({ node: "16.15.0" });
    });

    it("should extract multiple versions", () => {
      const config = {
        node: "16.15.0",
        postgres: "14.5",
        redis: "7.0.5",
        other: "value",
      };
      const versions = extractVersions(config);
      expect(versions).toEqual({
        node: "16.15.0",
        postgres: "14.5",
        redis: "7.0.5",
      });
    });

    it("should handle nodejs key", () => {
      const config = { nodejs: "18.0.0" };
      const versions = extractVersions(config);
      expect(versions).toEqual({ nodejs: "18.0.0" });
    });

    it("should handle postgresql key", () => {
      const config = { postgresql: "15.0" };
      const versions = extractVersions(config);
      expect(versions).toEqual({ postgresql: "15.0" });
    });

    it("should extract stripe_api_version", () => {
      const config = { stripe_api_version: "2023-08-01" };
      const versions = extractVersions(config);
      expect(versions).toEqual({ stripe_api_version: "2023-08-01" });
    });

    it("should return empty object when no versions found", () => {
      const config = { other: "value", another: "data" };
      const versions = extractVersions(config);
      expect(versions).toEqual({});
    });

    it("should be case insensitive", () => {
      const config = { NODE: "16.15.0", POSTGRES: "14.5" };
      const versions = extractVersions(config);
      expect(Object.keys(versions).length).toBe(2);
    });
  });

  describe("normalizeConfig", () => {
    it("should parse and normalize versions", () => {
      const text = "node=v16.15\nredis=7.0";
      const result = normalizeConfig(text);
      expect(result).toEqual({
        node: "16.15.0",
        redis: "7.0.0",
      });
    });

    it("should preserve non-version values", () => {
      const text = "node=16.15.0\nurl=https://example.com";
      const result = normalizeConfig(text);
      expect(result).toEqual({
        node: "16.15.0",
        url: "https://example.com",
      });
    });

    it("should handle mixed content", () => {
      const text = "# Configuration\nnode: v16.15\nredis: 7.0.5\napp_name: MyApp";
      const result = normalizeConfig(text);
      expect(result.node).toBe("16.15.0");
      expect(result.redis).toBe("7.0.5");
      expect(result.app_name).toBe("MyApp");
    });

    it("should handle empty text", () => {
      const result = normalizeConfig("");
      expect(result).toEqual({});
    });
  });
});
