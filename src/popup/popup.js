const statusEl = document.getElementById('status')
const xphanEl = document.getElementById('xphan')

document.getElementById('run').addEventListener('click', async () => {
  status('Running in current tab...')
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return status('No active tab found.')

  // Pass optional header value into the content script (if you really need it)
  chrome.tabs.sendMessage(
    tab.id,
    { type: 'TEMU_ORDERS_RUN', xPhanData: xphanEl.value.trim() || null },
    (resp) => {
      const err = chrome.runtime.lastError
      if (err) return status('Could not reach page. Open temu.com and try again.')
      if (resp?.ok) return status('Overlay opened.')
      return status(resp?.error || 'Unknown error.')
    }
  )
})

document.getElementById('close').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return status('No active tab found.')
  chrome.tabs.sendMessage(tab.id, { type: 'TEMU_ORDERS_CLOSE' }, () => {
    status('Close requested.')
  })
})

function status(msg) {
  statusEl.textContent = msg
}
