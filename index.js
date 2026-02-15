async function fetchTemuOrders({ type = 'all', page = 1, offsetMap = null} = {}) {
  const url = '/pt-en/api/bg/aristotle/user_order_list?is_back=1';
  
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
    size:30,
    need_has_next_page: true,
    offset: null,
    offset_map: offsetMap,
    page_sn: 10054,
    refer_page_sn: "10032",
    sort_values_map: null,
    type: "all"
  };
  
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json;charset=UTF-8',
      'x-document-referer': location.href,
      // If this value is required and changes per session/page, copy it from DevTools > Network
      'x-phan-data': '0aeJx7xMxiYAgkomMBESQC7A'
    },
    body: JSON.stringify(body)
  });

  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 500)}`);
  }
  
  return res.json();
}

async function fetchAllOrders() {
  let page = 1
  let orders = []
  let hasNextPage = true
  let offsetMap = null

  while(hasNextPage){
    const data = await fetchTemuOrders({ page, offsetMap })

    if(data) {
      orders.push(...data.view_orders)

      page++
      hasNextPage = data.has_next_page
      offsetMap = data.offset_map
      
    } else break
  }

  return orders
}

// Collect data

const orders = await fetchAllOrders()
const items = orders.flatMap(orderparent => orderparent.order_list).flatMap(orderchild => orderchild.order_goods)
let cards = []

cards.push(...items.map((order, idx) => {
  const title = order.spec
  const alt = order.goods_name
  const url = order.goods_link_url
  const src = order.thumb_url + '?imageView2/2/w/300/q/70/format/avif'
  if (!title || !src) return null
  return { id: idx + 1, title, src, url, alt }
}))

// Remove existing overlay if present
const existing = document.getElementById('__aria_cards_overlay__')
if (existing) existing.remove()

// Build overlay
const overlay = document.createElement('div')
overlay.id = '__aria_cards_overlay__'
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

// Styles
const style = document.createElement('style')
style.textContent = `
  #__aria_cards_overlay__{
    position: fixed; inset: 12px;
    background: rgba(15,15,18,.92);
    color: #fff;
    z-index: 2147483647;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,.45);
    display: flex;
    flex-direction: column;
    overflow: scroll;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  }
  #__aria_cards_overlay__ button{
    background: rgba(255,255,255,.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,.18);
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
  }
  #__aria_cards_overlay__ button:hover{
    background: rgba(255,255,255,.16);
  }
  .__aria_cards_header__{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,.12);
    backdrop-filter: blur(6px);
  }
  .__aria_cards_actions__{ display:flex; gap:8px; }
  .__aria_cards_grid__{
    padding: 14px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  .__aria_card__{
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    cursor: pointer;
  }
  .__aria_card__ img{
    width: 100%;
    height: 160px;
    object-fit: cover;
    display: block;
    background: rgba(255,255,255,.04);
  }
  .__aria_card__ .__aria_card_body__{
    padding: 10px 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .__aria_card__ .__aria_card_title__{
    font-size: 12px;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    opacity: .95;
  }
  .__aria_card__ .__aria_card_meta__{
    font-size: 11px;
    opacity: .7;
  }
`

document.head.appendChild(style)
document.body.appendChild(overlay)

const grid = overlay.querySelector('.__aria_cards_grid__')

// Render cards
cards.forEach((item) => {
  const card = document.createElement('div')
  card.className = '__aria_card__'
  card.innerHTML = `
    <a target="_blank" rel="noopener noreferrer" href="${item.url}">
    <img src="${item.src}" alt="${escapeHtml(item.alt)}">
    </a>
    <div class="__aria_card_body__">
      <div class="__aria_card_title__">${escapeHtml(item.title)}</div>
      <div class="__aria_card_meta__">#${item.id}</div>
    </div>
  `
  grid.appendChild(card)
})

// Buttons
overlay.querySelector('#__aria_cards_close__').addEventListener('click', () => {
  overlay.remove()
  style.remove()
})

overlay.querySelector('#__aria_cards_copy__').addEventListener('click', async () => {
  const payload = cards.map(({ id, title, src }) => ({ id, title, src }))
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    toast('Copied JSON to clipboard')
  } catch {
    console.log(payload)
    toast('Could not copy. JSON logged to console.')
  }
})

// Helpers
function escapeHtml (str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function toast (msg) {
  const t = document.createElement('div')
  t.textContent = msg
  t.style.cssText = `
    position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
    background: rgba(0,0,0,.75); color:#fff; padding: 10px 12px;
    border-radius: 10px; z-index: 2147483647; font-size: 12px;
    border: 1px solid rgba(255,255,255,.15);
  `
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 1500)
}
