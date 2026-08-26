import { describe, it, expect } from 'vitest'
import { isRefusal, isStatus } from '@/lib/apiError'
import { ApiError } from '@/api/types'

describe('isStatus', () => {
  it('matches the status it was asked about', () => {
    expect(isStatus(new ApiError(409, 'nope'), 409)).toBe(true)
    expect(isStatus(new ApiError(404, 'gone'), 409)).toBe(false)
  })

  it('is false for anything that is not an answer from the server', () => {
    expect(isStatus(new TypeError('offline'), 409)).toBe(false)
    expect(isStatus(undefined, 409)).toBe(false)
  })
})

describe('isRefusal', () => {
  it('is true for the server saying no', () => {
    expect(isRefusal(new ApiError(400, 'bad'))).toBe(true)
    expect(isRefusal(new ApiError(404, 'gone'))).toBe(true)
    expect(isRefusal(new ApiError(499, 'odd'))).toBe(true)
  })

  // A 500 has no sentence worth showing and the caller can be invited to retry, which is the
  // whole difference between this and any other failure.
  it('is false for a failure rather than a refusal', () => {
    expect(isRefusal(new ApiError(500, 'boom'))).toBe(false)
    expect(isRefusal(new ApiError(503, 'later'))).toBe(false)
    expect(isRefusal(new TypeError('offline'))).toBe(false)
  })
})
