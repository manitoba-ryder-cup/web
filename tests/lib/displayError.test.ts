import { describe, it, expect } from 'vitest'
import { displayError } from '@/lib/displayError'
import { ApiError } from '@/api/types'

const FALLBACK = 'Sorry, something went wrong. Please try again later.'

describe('displayError', () => {
  // The server decides the wording; this only decides whether any arrived.
  it('shows what the server said', () => {
    expect(displayError(new ApiError(401, 'Incorrect email or password'))).toBe('Incorrect email or password')
    expect(displayError(new ApiError(403, 'Please verify your email address before logging in'))).toBe(
      'Please verify your email address before logging in',
    )
    expect(displayError(new ApiError(404, 'Match not found'))).toBe('Match not found')
  })

  // Wording no server sends, so a fixture equal to the fallback cannot pass by accident.
  it('shows a fault message the same way', () => {
    expect(displayError(new ApiError(500, 'The tea urn is on fire'))).toBe('The tea urn is on fire')
  })

  it('falls back when nothing usable arrived', () => {
    expect(displayError(new ApiError(502, ''))).toBe(FALLBACK)
    expect(displayError(new ApiError(401, '   '))).toBe(FALLBACK)
    expect(displayError(new TypeError('' /* fetch rejects with no message */))).toBe(FALLBACK)
    expect(displayError(undefined)).toBe(FALLBACK)
    expect(displayError('a thrown string')).toBe(FALLBACK)
  })
})
