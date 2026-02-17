window.PopupActions = {
  async run() {
    const { status, xphanEl } = window.PopupUI

    status('Running in current tab...')
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return status('No active tab found.')

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
  },

  async close() {
    const { status } = window.PopupUI
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return status('No active tab found.')

    chrome.tabs.sendMessage(tab.id, { type: 'TEMU_ORDERS_CLOSE' }, () => {
      status('Close requested.')
    })
  }
}
