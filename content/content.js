const OVERLAY_ID = '__aria_cards_overlay__'

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
  // Remove existing overlay if present
  closeOverlay()

  const orders = await fetchAllOrders({ xPhanData })
  const items = orders
    .flatMap((orderparent) => orderparent?.order_list ?? [])
    .flatMap((orderchild) => orderchild?.order_goods ?? [])

  const cards = items
    .map((order, idx) => {
      const title = order?.spec
      const alt = order?.goods_name
      const url = order?.goods_link_url
      const src = order?.thumb_url
        ? order.thumb_url + '?imageView2/2/w/300/q/70/format/avif'
        : null
      if (!title || !src) return null
      return { id: idx + 1, title, src, url, alt }
    })
    .filter(Boolean)

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
    card.innerHTML = `
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
    const payload = cards.map(({ id, title, src, url, alt }) => ({ id, title, src, url, alt }))
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

  // Only include if you set it in popup; otherwise omit.
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
