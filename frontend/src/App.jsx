import React, { useEffect, useState } from 'react'
import { api } from './api.js'

export default function App() {
	const [tab, setTab] = useState('units')
	const [error, setError] = useState(null)

	return (
		<div className="app">
			<header>
				<h1>Self-Storage CMS</h1>
				<nav>
					<button className={tab === 'units' ? 'active' : ''} onClick={() => setTab('units')}>
						Jedinice
					</button>
					<button className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>
						Klijenti
					</button>
					<button className={tab === 'rentals' ? 'active' : ''} onClick={() => setTab('rentals')}>
						Zakupi
					</button>
				</nav>
			</header>

			{error && (
				<div className="error" onClick={() => setError(null)}>
					{error} (klik za zatvaranje)
				</div>
			)}

			<main>
				{tab === 'units' && <Units onError={setError} />}
				{tab === 'customers' && <Customers onError={setError} />}
				{tab === 'rentals' && <Rentals onError={setError} />}
			</main>
		</div>
	)
}

function Units({ onError }) {
	const [units, setUnits] = useState([])
	const [form, setForm] = useState({ code: '', size_m2: '', monthly_price: '' })

	const load = () =>
		api
			.getUnits()
			.then(setUnits)
			.catch((e) => onError(e.message))
	useEffect(() => {
		load()
	}, [])

	const submit = async (e) => {
		e.preventDefault()
		try {
			await api.createUnit({
				code: form.code,
				size_m2: Number(form.size_m2),
				monthly_price: Number(form.monthly_price),
			})
			setForm({ code: '', size_m2: '', monthly_price: '' })
			load()
		} catch (err) {
			onError(err.message)
		}
	}

	return (
		<section>
			<h2>Skladišne jedinice</h2>
			<form onSubmit={submit} className="row">
				<input
					placeholder="Kod (npr. C-301)"
					value={form.code}
					onChange={(e) => setForm({ ...form, code: e.target.value })}
					required
				/>
				<input
					placeholder="m²"
					type="number"
					step="0.01"
					value={form.size_m2}
					onChange={(e) => setForm({ ...form, size_m2: e.target.value })}
					required
				/>
				<input
					placeholder="Cena/mesec"
					type="number"
					step="0.01"
					value={form.monthly_price}
					onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
					required
				/>
				<button type="submit">Dodaj jedinicu</button>
			</form>
			<table>
				<thead>
					<tr>
						<th>Kod</th>
						<th>m²</th>
						<th>Cena/mesec</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{units.map((u) => (
						<tr key={u.id}>
							<td>{u.code}</td>
							<td>{u.size_m2}</td>
							<td>{u.monthly_price} €</td>
							<td>
								<span className={`badge ${u.status}`}>
									{u.status === 'rented' ? 'iznajmljeno' : 'slobodno'}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	)
}

function Customers({ onError }) {
	const [customers, setCustomers] = useState([])
	const [form, setForm] = useState({ name: '', email: '', phone: '' })

	const load = () =>
		api
			.getCustomers()
			.then(setCustomers)
			.catch((e) => onError(e.message))
	useEffect(() => {
		load()
	}, [])

	const submit = async (e) => {
		e.preventDefault()
		try {
			await api.createCustomer(form)
			setForm({ name: '', email: '', phone: '' })
			load()
		} catch (err) {
			onError(err.message)
		}
	}

	return (
		<section>
			<h2>Klijenti</h2>
			<form onSubmit={submit} className="row">
				<input
					placeholder="Ime i prezime"
					value={form.name}
					onChange={(e) => setForm({ ...form, name: e.target.value })}
					required
				/>
				<input
					placeholder="Email"
					type="email"
					value={form.email}
					onChange={(e) => setForm({ ...form, email: e.target.value })}
					required
				/>
				<input
					placeholder="Telefon"
					value={form.phone}
					onChange={(e) => setForm({ ...form, phone: e.target.value })}
				/>
				<button type="submit">Dodaj klijenta</button>
			</form>
			<table>
				<thead>
					<tr>
						<th>Ime</th>
						<th>Email</th>
						<th>Telefon</th>
					</tr>
				</thead>
				<tbody>
					{customers.map((c) => (
						<tr key={c.id}>
							<td>{c.name}</td>
							<td>{c.email}</td>
							<td>{c.phone || '-'}</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	)
}

function Rentals({ onError }) {
	const [rentals, setRentals] = useState([])
	const [units, setUnits] = useState([])
	const [customers, setCustomers] = useState([])
	const [form, setForm] = useState({ unit_id: '', customer_id: '' })

	const load = () => {
		api.getRentals()
			.then(setRentals)
			.catch((e) => onError(e.message))
		api.getUnits()
			.then(setUnits)
			.catch((e) => onError(e.message))
		api.getCustomers()
			.then(setCustomers)
			.catch((e) => onError(e.message))
	}
	useEffect(() => {
		load()
	}, [])

	const submit = async (e) => {
		e.preventDefault()
		try {
			await api.createRental({ unit_id: Number(form.unit_id), customer_id: Number(form.customer_id) })
			setForm({ unit_id: '', customer_id: '' })
			load()
		} catch (err) {
			onError(err.message)
		}
	}

	const end = async (id) => {
		try {
			await api.endRental(id)
			load()
		} catch (err) {
			onError(err.message)
		}
	}

	const availableUnits = units.filter((u) => u.status === 'available')

	return (
		<section>
			<h2>Zakupi</h2>
			<form onSubmit={submit} className="row">
				<select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} required>
					<option value="">-- izaberi jedinicu --</option>
					{availableUnits.map((u) => (
						<option key={u.id} value={u.id}>
							{u.code} ({u.size_m2} m²)
						</option>
					))}
				</select>
				<select
					value={form.customer_id}
					onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
					required
				>
					<option value="">-- izaberi klijenta --</option>
					{customers.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
				<button type="submit">Iznajmi</button>
			</form>
			<table>
				<thead>
					<tr>
						<th>#</th>
						<th>Jedinica</th>
						<th>Klijent</th>
						<th>Od</th>
						<th>Do</th>
						<th>Status</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{rentals.map((r) => (
						<tr key={r.id}>
							<td>{r.id}</td>
							<td>{r.unit_code}</td>
							<td>{r.customer_name}</td>
							<td>{r.start_date?.slice(0, 10)}</td>
							<td>{r.end_date?.slice(0, 10) || '-'}</td>
							<td>
								<span className={`badge ${r.active ? 'rented' : 'available'}`}>
									{r.active ? 'aktivan' : 'zatvoren'}
								</span>
							</td>
							<td>
								{r.active && (
									<button className="link" onClick={() => end(r.id)}>
										Raskini
									</button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	)
}
