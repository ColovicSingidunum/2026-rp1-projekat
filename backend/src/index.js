import express from 'express'
import { pool, initDb } from './db.js'

const app = express()
app.use(express.json())

// sve rute su pod /api
const api = express.Router()

api.get('/health', async (_req, res) => {
	try {
		await pool.query('SELECT 1')
		res.json({ status: 'ok' })
	} catch {
		res.status(503).json({ status: 'db_unavailable' })
	}
})

// klijenti
api.get('/customers', async (_req, res, next) => {
	try {
		const { rows } = await pool.query('SELECT * FROM customers ORDER BY id')
		res.json(rows)
	} catch (e) {
		next(e)
	}
})

api.post('/customers', async (req, res, next) => {
	try {
		const { name, email, phone } = req.body
		if (!name || !email) return res.status(400).json({ error: 'name i email su obavezni' })
		const { rows } = await pool.query(
			'INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
			[name, email, phone || null],
		)
		res.status(201).json(rows[0])
	} catch (e) {
		next(e)
	}
})

// jedinice
api.get('/units', async (_req, res, next) => {
	try {
		const { rows } = await pool.query('SELECT * FROM units ORDER BY code')
		res.json(rows)
	} catch (e) {
		next(e)
	}
})

api.post('/units', async (req, res, next) => {
	try {
		const { code, size_m2, monthly_price } = req.body
		if (!code || size_m2 == null || monthly_price == null) {
			return res.status(400).json({ error: 'code, size_m2 i monthly_price su obavezni' })
		}
		const { rows } = await pool.query(
			'INSERT INTO units (code, size_m2, monthly_price) VALUES ($1, $2, $3) RETURNING *',
			[code, size_m2, monthly_price],
		)
		res.status(201).json(rows[0])
	} catch (e) {
		if (e.code === '23505') return res.status(409).json({ error: 'Jedinica sa tim kodom već postoji' })
		next(e)
	}
})

// zakupi
api.get('/rentals', async (_req, res, next) => {
	try {
		const { rows } = await pool.query(`
      SELECT r.*, u.code AS unit_code, c.name AS customer_name
      FROM rentals r
      JOIN units u ON u.id = r.unit_id
      JOIN customers c ON c.id = r.customer_id
      ORDER BY r.id DESC
    `)
		res.json(rows)
	} catch (e) {
		next(e)
	}
})

// iznajmljivanje - pravimo zakup i menjamo status jedinice na 'rented'
// radimo u transakciji da ne ostane nekonzistentno
api.post('/rentals', async (req, res, next) => {
	const client = await pool.connect()
	try {
		const { unit_id, customer_id } = req.body
		if (!unit_id || !customer_id) {
			return res.status(400).json({ error: 'unit_id i customer_id su obavezni' })
		}
		await client.query('BEGIN')
		const unit = await client.query('SELECT status FROM units WHERE id = $1 FOR UPDATE', [unit_id])
		if (unit.rowCount === 0) {
			await client.query('ROLLBACK')
			return res.status(404).json({ error: 'Jedinica ne postoji' })
		}
		if (unit.rows[0].status === 'rented') {
			await client.query('ROLLBACK')
			return res.status(409).json({ error: 'Jedinica je već iznajmljena' })
		}
		const { rows } = await client.query('INSERT INTO rentals (unit_id, customer_id) VALUES ($1, $2) RETURNING *', [
			unit_id,
			customer_id,
		])
		await client.query("UPDATE units SET status = 'rented' WHERE id = $1", [unit_id])
		await client.query('COMMIT')
		res.status(201).json(rows[0])
	} catch (e) {
		await client.query('ROLLBACK').catch(() => {})
		if (e.code === '23503') return res.status(400).json({ error: 'Nepostojeći unit_id ili customer_id' })
		next(e)
	} finally {
		client.release()
	}
})

// raskid zakupa - zatvaramo zakup i vracamo jedinicu na 'available'
api.post('/rentals/:id/end', async (req, res, next) => {
	const client = await pool.connect()
	try {
		await client.query('BEGIN')
		const rental = await client.query('SELECT unit_id, active FROM rentals WHERE id = $1 FOR UPDATE', [
			req.params.id,
		])
		if (rental.rowCount === 0) {
			await client.query('ROLLBACK')
			return res.status(404).json({ error: 'Zakup ne postoji' })
		}
		if (!rental.rows[0].active) {
			await client.query('ROLLBACK')
			return res.status(409).json({ error: 'Zakup je već zatvoren' })
		}
		await client.query('UPDATE rentals SET active = false, end_date = CURRENT_DATE WHERE id = $1', [req.params.id])
		await client.query("UPDATE units SET status = 'available' WHERE id = $1", [rental.rows[0].unit_id])
		await client.query('COMMIT')
		res.json({ status: 'ended' })
	} catch (e) {
		await client.query('ROLLBACK').catch(() => {})
		next(e)
	} finally {
		client.release()
	}
})

app.use('/api', api)

app.use((err, _req, res, _next) => {
	console.error(err)
	res.status(500).json({ error: 'Interna greska servera' })
})

const PORT = Number(process.env.PORT) || 3000

initDb()
	.then(() => {
		app.listen(PORT, () => console.log(`Backend slusa na portu ${PORT}`))
	})
	.catch((err) => {
		console.error('Greska pri inicijalizaciji baze:', err)
		process.exit(1)
	})
