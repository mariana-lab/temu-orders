window.TemuOrders = window.TemuOrders || {}

window.TemuOrders.renderOrderNote = function renderOrderNote(order, orderCount) {
  const { escapeHtml, resolveUrl } = window.TemuOrders
  return `<div class="__aria_order_note__">
    <a target="_blank" rel="noopener noreferrer" href="${resolveUrl(order.orderUrl) || '#'}">
      Order #${orderCount - order.id + 1}
    </a>
    <span>${escapeHtml(order.shippingStatus)}</span>
    <span>${escapeHtml(order.orderPrice)}</span>
    <span>${escapeHtml(order.orderedAt)}</span>
  </div>`
}

window.TemuOrders.renderItemCard = function renderItemCard(item, idx) {
  const { escapeHtml } = window.TemuOrders
  return `<div class="__aria_card__">
    <a target="_blank" rel="noopener noreferrer" href="${item.url || '#'}">
      <img src="${item.src}" alt="${escapeHtml(item.alt)}">
    </a>
    <div class="__aria_card_body__">
      <div class="__aria_card_meta__">
        <span>Item #${idx + 1}</span>
        <span>${escapeHtml(item.price)}</span>
      </div>
      <div class="__aria_card_title__">${escapeHtml(item.title)}</div>
    </div>
  </div>`
}
