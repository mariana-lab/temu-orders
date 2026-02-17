window.TemuOrders = window.TemuOrders || {}

window.TemuOrders.buildOverlay = function buildOverlay(orderCards) {
  const { OVERLAY_ID, formatMoney, escapeHtml, toast, renderOrderNote, renderItemCard } = window.TemuOrders

  const overlay = document.createElement('div')
  const totalItems = orderCards.reduce((sum, order) => sum + order.items.length, 0)
  const totalAmount = orderCards.reduce((sum, order) => sum + order.orderAmount, 0)
  const currencySymbol = orderCards.find((order) => order.currencySymbol)?.currencySymbol || '€'

  overlay.id = OVERLAY_ID
  overlay.innerHTML = `
    <div class="__aria_cards_header__">
      <div>
        <b>Orders</b> (${orderCards.length}) <b>Items</b> (${totalItems}) <b>${escapeHtml(formatMoney(totalAmount))} ${escapeHtml(currencySymbol)}</b>
      </div>
      <div class="__aria_cards_actions__">
        <button id="__aria_cards_copy__">Copy JSON</button>
        <button id="__aria_cards_close__">Close</button>
      </div>
    </div>
    <div class="__aria_cards_grid__"></div>
  `
  document.body.appendChild(overlay)

  const grid = overlay.querySelector('.__aria_cards_grid__')

  orderCards.forEach((order) => {
    order.items.forEach((item, idx) => {
      const itemGroup = document.createElement('div')
      itemGroup.className = '__aria_item_group__'
      itemGroup.style.setProperty('--order-accent-color', order.accentColor)

      const note = idx === 0 ? renderOrderNote(order, orderCards.length) : ''
      itemGroup.innerHTML = `${note}${renderItemCard(item, idx)}`
      grid.appendChild(itemGroup)
    })
  })

  overlay.querySelector('#__aria_cards_close__').addEventListener('click', window.TemuOrders.closeOverlay)

  overlay.querySelector('#__aria_cards_copy__').addEventListener('click', async () => {
    const payload = orderCards.map(({ id, shippingStatus, orderedAt, orderPrice, items }) => ({
      id,
      shippingStatus,
      orderedAt,
      orderPrice,
      items
    }))

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      toast('Copied JSON to clipboard')
    } catch {
      console.log(payload)
      toast('Could not copy. JSON logged to console.')
    }
  })
}

window.TemuOrders.closeOverlay = function closeOverlay() {
  const existing = document.getElementById(window.TemuOrders.OVERLAY_ID)
  if (existing) existing.remove()
}
