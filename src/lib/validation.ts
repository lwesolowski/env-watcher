/**
 * Validation utilities for EnvWatcher
 */

export const CHAR_LIMIT = 10000;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates character limit for environment configuration
 * @param text - The configuration text to validate
 * @param limit - Maximum allowed characters (default: 10000)
 * @returns ValidationResult with isValid and optional error message
 */
export function validateCharLimit(text: string, limit: number = CHAR_LIMIT): ValidationResult {
  if (text.length > limit) {
    return {
      isValid: false,
      error: `Configuration exceeds ${limit.toLocaleString()} character limit (${text.length.toLocaleString()} chars)`,
    };
  }
  return { isValid: true };
}

/**
 * Checks if text is near the character limit (>90%)
 * @param text - The configuration text to check
 * @param limit - Maximum allowed characters (default: 10000)
 * @returns true if text is near the limit
 */
export function isNearCharLimit(text: string, limit: number = CHAR_LIMIT): boolean {
  return text.length > limit * 0.9;
}

/**
 * Validates all three environment configurations
 * @param develop - Develop environment config
 * @param staging - Staging environment config
 * @param production - Production environment config
 * @returns ValidationResult with isValid and optional error message
 */
export function validateAllConfigs(develop: string, staging: string, production: string): ValidationResult {
  const developResult = validateCharLimit(develop);
  if (!developResult.isValid) {
    return { isValid: false, error: `Develop: ${developResult.error}` };
  }

  const stagingResult = validateCharLimit(staging);
  if (!stagingResult.isValid) {
    return { isValid: false, error: `Staging: ${stagingResult.error}` };
  }

  const productionResult = validateCharLimit(production);
  if (!productionResult.isValid) {
    return { isValid: false, error: `Production: ${productionResult.error}` };
  }

  return { isValid: true };
}

/**
 * Checks if generate report button should be disabled
 * @param develop - Develop environment config
 * @param staging - Staging environment config
 * @param production - Production environment config
 * @returns true if button should be disabled
 */
export function shouldDisableGenerateButton(develop: string, staging: string, production: string): boolean {
  return !validateAllConfigs(develop, staging, production).isValid;
}
