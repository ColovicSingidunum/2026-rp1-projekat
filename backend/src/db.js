import pg from 'pg'

const { Pool } = pg

// konekcija na bazu - podaci dolaze iz env (postavlja ih docker-compose)
// host je "db", to je ime servisa na internal mrezi
export const pool = new Pool({
	host: process.env.PGHOST || 'db',
	user: process.env.PGUSER || 'storage',
	port: Number(process.env.PGPORT) || 5432,
	password: process.env.PGPASSWORD || 'storage_pass',
	database: process.env.PGDATABASE || 'selfstorage',
})

// kreiranje tabela (samo ako ne postoje)
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  size_m2       NUMERIC(6,2) NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'rented'))
);

CREATE TABLE IF NOT EXISTS rentals (
  id          SERIAL PRIMARY KEY,
  unit_id     INTEGER NOT NULL REFERENCES units(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  start_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date    DATE,
  active      BOOLEAN NOT NULL DEFAULT true
);
`

const SEED_SQL = `
INSERT INTO customers (name, email, phone) VALUES
  ('Marko Marković', 'marko@example.com', '+381601111111'),
  ('Jelena Jović',   'jelena@example.com', '+381602222222');

INSERT INTO units (code, size_m2, monthly_price, status) VALUES
  ('A-101',  5.00,  40.00, 'available'),
  ('A-102', 10.00,  70.00, 'available'),
  ('B-201', 15.00, 100.00, 'available'),
  ('B-202', 20.00, 130.00, 'available');
`

// ponekad baza nije spremna odmah, pa probamo vise puta
async function waitForDb(retries = 15, delayMs = 2000) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await pool.query('SELECT 1')
			return
		} catch (err) {
			console.log(`Cekam bazu (pokusaj ${attempt}/${retries}): ${err.code || err.message}`)
			if (attempt === retries) throw err
			await new Promise((r) => setTimeout(r, delayMs))
		}
	}
}

export async function initDb() {
	await waitForDb()
	await pool.query(SCHEMA_SQL)

	// ubaci test podatke samo ako je baza prazna
	const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM units')
	if (rows[0].n === 0) {
		await pool.query(SEED_SQL)
		console.log('Ubaceni test podaci.')
	} else {
		console.log('Baza vec ima podatke, preskacem seed.')
	}
}
