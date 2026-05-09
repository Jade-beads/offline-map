/**
 * DOM / 浏览器环境工具
 */

export function scheduleTask(callback, delay) {
  const timerHost = typeof window !== 'undefined' && window.setTimeout
    ? window
    : globalThis

  return timerHost.setTimeout(callback, delay)
}

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getPromptInput(message, defaultValue) {
  const promptFn = typeof window !== 'undefined' && typeof window.prompt === 'function'
    ? window.prompt.bind(window)
    : (typeof globalThis.prompt === 'function' ? globalThis.prompt.bind(globalThis) : null)

  return promptFn ? promptFn(message, defaultValue) : null
}
