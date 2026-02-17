window.TemuOrders = window.TemuOrders || {}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TEMU_ORDERS_CLOSE') {
    window.TemuOrders.closeOverlay()
    sendResponse({ ok: true })
    return
  }

  if (msg?.type === 'TEMU_ORDERS_RUN') {
    run(msg?.xPhanData || null)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }))
    return true
  }
})

async function run(xPhanData) {
  const { fetchAllOrders, ORDER_COLORS, parseMoneyValue, buildOverlay } = window.TemuOrders

  window.TemuOrders.closeOverlay()

  const orders = await fetchAllOrders({ xPhanData })
  const orderCards = orders
    .map((order, idx) => {
      const items = (order?.order_list ?? [])
        .map((entry) => entry?.order_goods)
        .filter(Boolean)
        .map((item) => {
          const title = item?.goods_name
          const alt = item?.spec
          const url = item?.goods_link_url
          const price = item?.goods_price_with_symbol_display
          const src = item?.thumb_url
            ? `${item.thumb_url}?imageView2/2/w/300/q/70/format/avif`
            : null
          if (!title || !src) return null
          return { title, src, url, alt, price }
        })
        .filter(Boolean)

      if (!items.length) return null

      const orderAmountRaw =
        order?.price_desc?.display_amount || order?.price_desc?.display_amount_with_symbol || null

      return {
        id: idx + 1,
        shippingStatus: order?.status_prompt || 'Unknown status',
        orderedAt: order?.parent_order_time_format || 'Unknown date',
        orderPrice:
          order?.price_desc?.display_amount_with_symbol || order?.price_desc?.display_amount || 'N/A',
        orderAmount: parseMoneyValue(orderAmountRaw),
        currencySymbol: order?.price_desc?.symbol || '€',
        orderUrl: order?.order_link_url || null,
        accentColor: ORDER_COLORS[idx % ORDER_COLORS.length],
        items
      }
    })
    .filter(Boolean)

  buildOverlay(orderCards)
}
