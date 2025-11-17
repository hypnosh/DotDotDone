/**
 * useCalendarSync (stub)
 *
 * Minimal sync layer placeholder. All functions are async and return a fake gcalId.
 * Later we will implement Google OAuth + real API calls.
 *
 * Functions:
 *  - syncSliceToGCal(fixedEvent)
 *  - syncCompletionToGCal(completionEvent)
 *  - createOrUpdateFixedEvent(fixedEvent)
 *  - deleteFixedEvent(fixedEvent)
 */

export function useCalendarSync() {
  // fake async writer to simulate remote sync
  async function fakeGCalWrite(obj) {
    // simulate network delay
    await new Promise(r => setTimeout(r, 200))
    return `gcal_${Date.now()}`
  }

  async function syncSliceToGCal(fixedEvent) {
    // fixedEvent: {id, date, start, end, duration, ...}
    const gcalId = await fakeGCalWrite(fixedEvent)
    return gcalId
  }

  async function syncCompletionToGCal(completionEvent) {
    const gcalId = await fakeGCalWrite(completionEvent)
    return gcalId
  }

  async function createOrUpdateFixedEvent(fixedEvent) {
    const gcalId = await fakeGCalWrite(fixedEvent)
    return gcalId
  }

  async function deleteFixedEvent(fixedEvent) {
    // simulate delete
    await new Promise(r => setTimeout(r, 150))
    return true
  }

  return {
    syncSliceToGCal,
    syncCompletionToGCal,
    createOrUpdateFixedEvent,
    deleteFixedEvent
  }
}
