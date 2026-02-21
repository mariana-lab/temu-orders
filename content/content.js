window.temuOrders = window.temuOrders || {}

const OVERLAY_ID = '__aria_cards_overlay__'
const ORDER_COLORS = [
  '#D9B8FF', // pastel violet
  '#FFD6B0', // pastel orange
  '#B9E3FF', // pastel blue
  '#F8F2AE', // pastel yellow
  '#C6C4FF', // pastel indigo
  '#FFBFC1', // pastel red
  '#BFEFCF' // pastel green
]
const CATEGORIES = {
  all: {
    itemsIds: []
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TEMU_ORDERS_CLOSE') {
    closeOverlay()
    sendResponse({ ok: true })
    return
  }

  if (msg?.type === 'TEMU_ORDERS_RUN') {
    runOrders(msg?.xPhanData || null)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }))
    return true // keep channel open for async
  }

  if (msg?.type === 'TEMU_ITEMS_RUN') {
    runItems()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }))
    return true // keep channel open for async
  }
})

async function runOrders(xPhanData) {
  closeOverlay()

  const orders = await getAllOrders({ xPhanData })
  window.temuOrders.orders = orders
  buildOrdersOverlay(orders)

  const itemsMap = await getAllItemsMap(orders)
  window.temuOrders.itemsMap = itemsMap
  CATEGORIES.all.itemsIds = Array.from(itemsMap).map(([key, value]) => value.id)
}

async function runItems(category) {
  closeOverlay()

  const itemsMap = window.temuOrders.itemsMap
  buildItemsOverlay(itemsMap, category)
}

function buildOrdersOverlay(orders) {
  const overlay = document.createElement('div')
  const totalItems = orders.reduce((sum, order) => sum + order.items.length, 0)
  const totalAmount = orders.reduce((sum, order) => sum + order.orderAmount, 0)
  const currencySymbol = orders.find((order) => order.currencySymbol)?.currencySymbol || '€'

  overlay.id = OVERLAY_ID
  overlay.innerHTML = `
    <div class="__aria_cards_header__">
      <div>
        <b>Orders</b> (${orders.length}) <b>Items</b> (${totalItems}) <b>${escapeHtml(formatMoney(totalAmount))} ${escapeHtml(currencySymbol)}</b>
      </div>
      <div class="__aria_cards_actions__">
        <button id="__aria_cards_items__">items</button>
        <button id="__aria_cards_close__">Close</button>
      </div>
    </div>
    <div class="__aria_cards_grid__"></div>
  `
  document.body.appendChild(overlay)

  const grid = overlay.querySelector('.__aria_cards_grid__')

  orders.forEach((order) => {
    order.items.forEach((item, idx) => {
      const itemGroup = document.createElement('div')
      itemGroup.className = '__aria_item_group__'
      itemGroup.style.setProperty('--order-accent-color', order.accentColor)

      const note = idx === 0
        ? `<div class="__aria_order_note__">
            <a target="_blank" rel="noopener noreferrer" href="${resolveUrl(order.orderUrl) || '#'}">
              Order #${orders.length - order.id + 1}
            </a>
            <span>${escapeHtml(order.shippingStatus)}</span>
            <span>${escapeHtml(order.orderPrice)}</span>
            <span>${escapeHtml(order.orderedAt)}</span>
          </div>`
        : ''

      itemGroup.innerHTML = `
        ${note}
        <div class="__aria_card__">
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
        </div>
      `
      grid.appendChild(itemGroup)
    })
  })

  overlay.querySelector('#__aria_cards_close__').addEventListener('click', closeOverlay)

  overlay.querySelector('#__aria_cards_items__').addEventListener('click', async () => {
    closeOverlay()
    buildItemsOverlay(window.temuOrders.itemsMap, CATEGORIES.all)
  })
}

function buildItemsOverlay(itemsMap, category, edit) {
  const overlay = document.createElement('div')
  const categoryItems = category.itemsIds.map(itemId => itemsMap.get(itemId))
  const totalItems = categoryItems.length
  const totalAmount = categoryItems.reduce((sum, item) => sum + item.price, 0)
  const currencySymbol = '€'

  overlay.id = OVERLAY_ID
  overlay.innerHTML = `
    <div class="__aria_cards_header__">
      <div>
        <b>${category.title}</b> (${totalItems}) <b>Items</b> (${totalItems}) <b>${escapeHtml(formatMoney(totalAmount))} ${escapeHtml(currencySymbol)}</b>
      </div>
      <div class="__aria_cards_actions__">
        <button id="__aria_cards_orders__">Orders</button>
        <button id="__aria_cards_close__">Close</button>
      </div>
    </div>
    <div class="__aria_cards_grid__"></div>
  `
  document.body.appendChild(overlay)

  const grid = overlay.querySelector('.__aria_cards_grid__')

  itemsMap.forEach((item, id) => {
    const itemGroup = document.createElement('div')
    itemGroup.className = '__aria_item_group__'

    itemGroup.innerHTML = `
        <div class="__aria_card__">
        <a target="_blank" rel="noopener noreferrer" href="${item.url || '#'}">
          <img src="${item.src}" alt="${escapeHtml(item.alt)}">
        </a>
        <div class="__aria_card_body__">
        <div class="__aria_card_meta__">
          <span>Item #${id}</span>
          <span>${escapeHtml(item.price)}</span>
        </div>
        <div class="__aria_card_title__">${escapeHtml(item.title)}</div>
        </div>
        </div>
      `
    grid.appendChild(itemGroup)
  })

  overlay.querySelector('#__aria_cards_orders__').addEventListener('click', async () => {
    closeOverlay()
    buildOrdersOverlay(window.temuOrders.orders)
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

async function getAllOrders({ xPhanData }) {
  const ordersRaw = await fetchAllOrders({ xPhanData })
  const orders = ordersRaw
    .map((order, idx) => {
      const items = (order?.order_list ?? [])
        .map((entry) => entry?.order_goods)
        .filter(Boolean)
        .map((item) => {
          const id = item?.goods_id
          const title = item?.goods_name
          const alt = item?.spec
          const url = item?.goods_link_url
          const price = item?.goods_price_with_symbol_display
          const src = item?.thumb_url
            ? item.thumb_url + '?imageView2/2/w/300/q/70/format/avif'
            : null
          if (!title || !src) return null
          return { id, title, src, url, alt, price }
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

  return orders
}

async function getAllItemsMap(orders) {
  const itemsMap = new Map();
  orders.forEach(order => order.items.forEach(item => itemsMap.set(item.id, item)))

  return itemsMap
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

function parseMoneyValue(value) {
  if (!value) return 0
  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function resolveUrl(url) {
  if (!url) return null
  try {
    return new URL(url, location.origin).href
  } catch {
    return null
  }
}