// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('btn', 'btn-primary')
    expect(result).toBe('btn btn-primary')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('btn', isActive && 'active')
    expect(result).toBe('btn active')
  })

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should filter out falsy values', () => {
    const result = cn('btn', false, null, undefined, 'primary')
    expect(result).toBe('btn primary')
  })
})
