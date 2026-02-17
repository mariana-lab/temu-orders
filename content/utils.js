window.TemuOrders = window.TemuOrders || {}

window.TemuOrders.escapeHtml = function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

window.TemuOrders.parseMoneyValue = function parseMoneyValue(value) {
  if (!value) return 0
  const normalized = String(value).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

window.TemuOrders.formatMoney = function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

window.TemuOrders.resolveUrl = function resolveUrl(url) {
  if (!url) return null
  try {
    return new URL(url, location.origin).href
  } catch {
    return null
  }
}

window.TemuOrders.toast = function toast(msg) {
  const t = document.createElement('div')
  t.className = '__aria_toast__'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 1500)
}
