const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(process.cwd(), 'database', 'doctorpod.db');
const rawDb = new sqlite3.Database(DB_PATH);

// Expose a minimal prepare(...).all/get/run wrapper so existing code can keep using db.prepare(...).all()
const db = {
	prepare: (sql) => ({
		all: (...params) => new Promise((resolve, reject) => {
			rawDb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
		}),
		get: (...params) => new Promise((resolve, reject) => {
			rawDb.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
		}),
		run: (...params) => new Promise((resolve, reject) => {
			rawDb.run(sql, params, function(err) {
				if (err) return reject(err);
				resolve({ lastID: this.lastID, changes: this.changes });
			});
		})
	}),
	close: () => new Promise((resolve, reject) => rawDb.close(err => err ? reject(err) : resolve()))
};

module.exports = db;
