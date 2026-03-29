export async function api(path, options = {}) {
  const token = localStorage.getItem('token')
  const isFormData = options.body instanceof FormData
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

export function isLoggedIn() { return !!localStorage.getItem('token') }

export function isAdmin() { return getUser()?.role === 'ADMIN' }

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/'
}

export function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function toast(message, type = 'success') {
  document.querySelectorAll('.toast').forEach(t => t.remove())
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, 3000)
}

export function renderNav(containerId = 'main-nav') {
  const el = document.getElementById(containerId)
  if (!el) return
  const user = getUser()
  el.innerHTML = `
    ${user ? '<a href="/pages/sell.html">Sell</a>' : ''}
    <a href="/pages/orders.html">Orders</a>
    ${user ? '<a href="/pages/account.html">Account</a>' : ''}
    ${user?.role === 'ADMIN' ? '<a href="/pages/admin.html">Admin</a>' : ''}
    ${!user ? '<a href="/pages/login.html">Sign In</a>' : ''}
    ${user ? '<button onclick="import(\'/js/utils.js\').then(m=>m.logout())">Sign Out</button>' : ''}
    <button id="cart-nav-btn" onclick="window.toggleCart?.()">
      My Cart
      <span class="cart-count" id="cart-badge" style="display:none">0</span>
    </button>
  `
}

export async function updateCartBadge() {
  const badge = document.getElementById('cart-badge')
  if (!badge || !isLoggedIn()) return
  try {
    const { items } = await api('/cart')
    const count = items.reduce((s, i) => s + i.quantity, 0)
    badge.textContent = count
    badge.style.display = count > 0 ? 'inline-flex' : 'none'
  } catch {}
}
