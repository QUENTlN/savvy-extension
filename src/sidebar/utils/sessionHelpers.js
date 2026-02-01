/**
 * Creates a deep clone of a session object
 * @param {Object} session - Session to clone
 * @returns {Object} Deep cloned session
 */
export function deepCloneSession(session) {
  // Use JSON parse/stringify for deep clone
  return JSON.parse(JSON.stringify(session));
}
