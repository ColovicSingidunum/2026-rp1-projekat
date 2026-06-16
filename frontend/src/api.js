// pozivi idu na /api (isti origin), proxy ih prosledjuje backendu
const BASE = '/api'

async function request(path, options) {
	const res = await fetch(BASE + path, {
		headers: { 'Content-Type': 'application/json' },
		...options,
	})
	if (!res.ok) {
		const body = await res.json().catch(() => ({}))
		throw new Error(body.error || `HTTP ${res.status}`)
	}
	return res.status === 204 ? null : res.json()
}

export const api = {
	getUnits: () => request('/units'),
	createUnit: (data) => request('/units', { method: 'POST', body: JSON.stringify(data) }),
	getCustomers: () => request('/customers'),
	createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
	getRentals: () => request('/rentals'),
	createRental: (data) => request('/rentals', { method: 'POST', body: JSON.stringify(data) }),
	endRental: (id) => request(`/rentals/${id}/end`, { method: 'POST' }),
}
