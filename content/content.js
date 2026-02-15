const OVERLAY_ID = '__aria_cards_overlay__'
const ORDER_ACCENT_COLORS = [
  '#c9a2ff', // pastel violet
  '#b8b3ff', // pastel indigo
  '#9fd0ff', // pastel blue
  '#a8f0be', // pastel green
  '#f6ef9c', // pastel yellow
  '#ffc89e', // pastel orange
  '#ffadad' // pastel red
]

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TEMU_ORDERS_CLOSE') {
    closeOverlay()
    sendResponse({ ok: true })
    return
  }

  if (msg?.type === 'TEMU_ORDERS_RUN') {
    run(msg?.xPhanData || null)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }))
    return true // keep channel open for async
  }
})

async function run(xPhanData) {
  closeOverlay()

  const orders = await fetchAllOrders({ xPhanData })
  const cards = orders.flatMap((order, orderIdx) => {
    const accentColor = ORDER_ACCENT_COLORS[orderIdx % ORDER_ACCENT_COLORS.length]
    const orderNumber = orderIdx + 1
    const shippingStatus = order?.status_prompt || 'Unknown status'
    const orderPrice = order?.price_desc?.display_amount || 'N/A'
    const orderedAt = order?.parent_order_time_format || 'Unknown date'
    const orderUrl = order?.order_link_url || '#'

    return (order?.order_list ?? [])
      .map((entry, itemIdx) => {
        const item = entry?.order_goods
        const title = item?.spec
        const alt = item?.goods_name
        const url = item?.goods_link_url
        const src = item?.thumb_url
          ? item.thumb_url + '?imageView2/2/w/300/q/70/format/avif'
          : null

        if (!title || !src) return null

        return {
          id: `${orderNumber}-${itemIdx + 1}`,
          title,
          src,
          url,
          alt,
          accentColor,
          showOrderNote: itemIdx === 0,
          orderNumber,
          shippingStatus,
          orderPrice,
          orderedAt,
          orderUrl
        }
      })
      .filter(Boolean)
  })

  buildOverlay(cards)
}

function buildOverlay(cards) {
  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.innerHTML = `
    <div class="__aria_cards_header__">
      <div><b>Items</b> (${cards.length})</div>
      <div class="__aria_cards_actions__">
        <button id="__aria_cards_copy__">Copy JSON</button>
        <button id="__aria_cards_close__">Close</button>
      </div>
    </div>
    <div class="__aria_cards_grid__"></div>
  `
  document.body.appendChild(overlay)

  const grid = overlay.querySelector('.__aria_cards_grid__')

  cards.forEach((item) => {
    const card = document.createElement('div')
    card.className = '__aria_card__'
    card.style.setProperty('--order-accent', item.accentColor)

    const note = item.showOrderNote
      ? `
        <div class="__aria_order_note__">
          <div>
            <b>Order #${item.orderNumber}</b> · ${escapeHtml(item.shippingStatus)}
          </div>
          <div>
            Price: ${escapeHtml(item.orderPrice)} · Date: ${escapeHtml(item.orderedAt)}
          </div>
          <a target="_blank" rel="noopener noreferrer" href="${item.orderUrl}">View order</a>
        </div>
      `
      : ''

    card.innerHTML = `
      ${note}
      <a target="_blank" rel="noopener noreferrer" href="${item.url || '#'}">
        <img src="${item.src}" alt="${escapeHtml(item.alt)}">
      </a>
      <div class="__aria_card_body__">
        <div class="__aria_card_title__">${escapeHtml(item.title)}</div>
        <div class="__aria_card_meta__">#${item.id}</div>
      </div>
    `
    grid.appendChild(card)
  })

  overlay.querySelector('#__aria_cards_close__').addEventListener('click', closeOverlay)

  overlay.querySelector('#__aria_cards_copy__').addEventListener('click', async () => {
    const payload = cards.map((card) => ({ ...card }))
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      toast('Copied JSON to clipboard')
    } catch {
      console.log(payload)
      toast('Could not copy. JSON logged to console.')
    }
  })
}

function closeOverlay() {
  const existing = document.getElementById(OVERLAY_ID)
  if (existing) existing.remove()
}

async function fetchTemuOrders({ type = 'all', page = 1, offsetMap = null, xPhanData = null } = {}) {
  const url = '/pt-en/api/bg/aristotle/user_order_list?is_back=1'

  const body = {
    extra_map: {
      support_change_payment: true,
      order_list_show_wait_pay_info: 1,
      need_new_delivery_shipping_module: 1,
      co_addr: true,
      shop_co_addr: true,
      show_new_guide_change_payment_desc: 1,
      need_after_sales_display_vo: 1,
      unify_style_support_mode: true
    },
    page,
    size: 30,
    need_has_next_page: true,
    offset: null,
    offset_map: offsetMap,
    page_sn: 10054,
    refer_page_sn: '10032',
    sort_values_map: null,
    type
  }

  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json;charset=UTF-8',
    'x-document-referer': location.href
  }

  if (xPhanData) headers['x-phan-data'] = xPhanData

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 500)}`)
  }

  return res.json()
}

async function fetchAllOrders({ xPhanData } = {}) {
  let page = 1
  let orders = []
  let hasNextPage = true
  let offsetMap = null

  while (hasNextPage) {
    const data = await fetchTemuOrders({ page, offsetMap, xPhanData })
    if (!data) break
    orders.push(...(data.view_orders ?? []))
    page++
    hasNextPage = !!data.has_next_page
    offsetMap = data.offset_map ?? null
  }

  return orders
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function toast(msg) {
  const t = document.createElement('div')
  t.className = '__aria_toast__'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 1500)
}
