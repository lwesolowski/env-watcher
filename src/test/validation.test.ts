import { describe, it, expect } from "vitest";
import {
  CHAR_LIMIT,
  validateCharLimit,
  isNearCharLimit,
  validateAllConfigs,
  shouldDisableGenerateButton,
} from "../lib/validation";

describe("Character Limit Validation", () => {
  describe("validateCharLimit", () => {
    it("should pass validation for empty string", () => {
      const result = validateCharLimit("");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should pass validation for text under limit", () => {
      const text = "a".repeat(5000);
      const result = validateCharLimit(text);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should pass validation for text at exact limit", () => {
      const text = "a".repeat(CHAR_LIMIT);
      const result = validateCharLimit(text);
      expect(result.isValid).toBe(true);
    });

    it("should fail validation for text over limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      const result = validateCharLimit(text);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("exceeds 10,000 character limit");
    });

    it("should fail validation for text significantly over limit", () => {
      const text = "a".repeat(15000);
      const result = validateCharLimit(text);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("15,000 chars");
    });

    it("should respect custom limit", () => {
      const text = "a".repeat(5001);
      const result = validateCharLimit(text, 5000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("5,000 character limit");
    });

    it("should handle multiline text correctly", () => {
      const text = "line\n".repeat(2500); // 5 chars * 2500 = 12500 chars
      const result = validateCharLimit(text);
      expect(result.isValid).toBe(false);
    });

    it("should handle unicode characters correctly", () => {
      const text = "🚀".repeat(CHAR_LIMIT + 1);
      const result = validateCharLimit(text);
      expect(result.isValid).toBe(false);
    });
  });

  describe("isNearCharLimit", () => {
    it("should return false for empty string", () => {
      expect(isNearCharLimit("")).toBe(false);
    });

    it("should return false for text far from limit", () => {
      const text = "a".repeat(5000);
      expect(isNearCharLimit(text)).toBe(false);
    });

    it("should return false for text at 89% of limit", () => {
      const text = "a".repeat(8900);
      expect(isNearCharLimit(text)).toBe(false);
    });

    it("should return true for text at 91% of limit", () => {
      const text = "a".repeat(9100);
      expect(isNearCharLimit(text)).toBe(true);
    });

    it("should return true for text at 95% of limit", () => {
      const text = "a".repeat(9500);
      expect(isNearCharLimit(text)).toBe(true);
    });

    it("should return true for text at exact limit", () => {
      const text = "a".repeat(CHAR_LIMIT);
      expect(isNearCharLimit(text)).toBe(true);
    });

    it("should return true for text over limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 100);
      expect(isNearCharLimit(text)).toBe(true);
    });
  });

  describe("validateAllConfigs", () => {
    it("should pass validation when all configs are valid", () => {
      const result = validateAllConfigs("develop config", "staging config", "production config");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should pass validation when all configs are at limit", () => {
      const text = "a".repeat(CHAR_LIMIT);
      const result = validateAllConfigs(text, text, text);
      expect(result.isValid).toBe(true);
    });

    it("should fail validation when develop config exceeds limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      const result = validateAllConfigs(text, "staging", "production");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Develop:");
    });

    it("should fail validation when staging config exceeds limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      const result = validateAllConfigs("develop", text, "production");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Staging:");
    });

    it("should fail validation when production config exceeds limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      const result = validateAllConfigs("develop", "staging", text);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Production:");
    });

    it("should fail validation when multiple configs exceed limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      const result = validateAllConfigs(text, text, "production");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Develop:");
    });

    it("should handle empty configs", () => {
      const result = validateAllConfigs("", "", "");
      expect(result.isValid).toBe(true);
    });
  });

  describe("shouldDisableGenerateButton", () => {
    it("should not disable button when all configs are valid", () => {
      expect(shouldDisableGenerateButton("develop", "staging", "production")).toBe(false);
    });

    it("should disable button when develop config exceeds limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      expect(shouldDisableGenerateButton(text, "staging", "production")).toBe(true);
    });

    it("should disable button when any config exceeds limit", () => {
      const text = "a".repeat(CHAR_LIMIT + 1);
      expect(shouldDisableGenerateButton("develop", text, "production")).toBe(true);
      expect(shouldDisableGenerateButton("develop", "staging", text)).toBe(true);
    });

    it("should not disable button for empty configs", () => {
      expect(shouldDisableGenerateButton("", "", "")).toBe(false);
    });

    it("should not disable button when configs are at exact limit", () => {
      const text = "a".repeat(CHAR_LIMIT);
      expect(shouldDisableGenerateButton(text, text, text)).toBe(false);
    });
  });
});
