window.TemuOrders = window.TemuOrders || {}

window.TemuOrders.fetchTemuOrders = async function fetchTemuOrders({
  type = 'all',
  page = 1,
  offsetMap = null,
  xPhanData = null
} = {}) {
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

window.TemuOrders.fetchAllOrders = async function fetchAllOrders({ xPhanData } = {}) {
  let page = 1
  let orders = []
  let hasNextPage = true
  let offsetMap = null

  while (hasNextPage) {
    const data = await window.TemuOrders.fetchTemuOrders({ page, offsetMap, xPhanData })
    if (!data) break
    orders.push(...(data.view_orders ?? []))
    page += 1
    hasNextPage = !!data.has_next_page
    offsetMap = data.offset_map ?? null
  }

  return orders
}
