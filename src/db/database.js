/**
 * Base de Datos SQLite Nativa para el Sistema de Citas Médicas
 * Utiliza el módulo oficial node:sqlite (Node.js 22.5+ / 24+)
 * sin dependencias nativas externas.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'citas_medicas.db');
const db = new DatabaseSync(dbPath);

// Inicialización de tablas SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS medicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    especialidad TEXT NOT NULL,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pacienteId INTEGER NOT NULL,
    pacienteNombre TEXT NOT NULL,
    edad INTEGER NOT NULL,
    medicoId INTEGER NOT NULL,
    medicoNombre TEXT,
    especialidad TEXT,
    fechaHora TEXT NOT NULL,
    motivoConsulta TEXT,
    estado TEXT DEFAULT 'CONFIRMADA',
    penalizacionAplicada INTEGER DEFAULT 0,
    montoPenalizacion REAL DEFAULT 0,
    motivoPenalizacion TEXT
  );
`);

// Poblar médicos iniciales si está vacío
const checkMedicos = db.prepare('SELECT COUNT(*) as count FROM medicos').get();
if (checkMedicos.count === 0) {
  const insertMedico = db.prepare('INSERT INTO medicos (nombre, especialidad, email) VALUES (?, ?, ?)');
  insertMedico.run('Dra. Elena Ramos', 'Pediatria', 'elena.ramos@clinica.com');
  insertMedico.run('Dr. Carlos Mendoza', 'Medicina Familiar', 'carlos.mendoza@clinica.com');
  insertMedico.run('Dra. Sofía Valdés', 'Medicina Familiar', 'sofia.valdes@clinica.com');
}

module.exports = {
  getMedicos: () => {
    return db.prepare('SELECT * FROM medicos').all();
  },

  getCitas: () => {
    const rows = db.prepare('SELECT * FROM citas ORDER BY id DESC').all();
    return rows.map(r => ({
      ...r,
      penalizacion: r.penalizacionAplicada ? {
        aplicarPenalizacion: true,
        montoPenalizacion: r.montoPenalizacion,
        motivo: r.motivoPenalizacion
      } : null
    }));
  },

  agregarCita: (cita) => {
    const stmt = db.prepare(`
      INSERT INTO citas (pacienteId, pacienteNombre, edad, medicoId, medicoNombre, especialidad, fechaHora, motivoConsulta, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA')
    `);
    const info = stmt.run(
      cita.pacienteId,
      cita.pacienteNombre,
      cita.edad,
      cita.medicoId,
      cita.medicoNombre,
      cita.especialidad,
      cita.fechaHora,
      cita.motivoConsulta
    );
    return { id: Number(info.lastInsertRowid), estado: 'CONFIRMADA', ...cita };
  },

  actualizarCita: (id, campos) => {
    const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
    if (!cita) return null;

    const penalizacion = campos.penalizacion || {};
    const stmt = db.prepare(`
      UPDATE citas 
      SET estado = ?, 
          penalizacionAplicada = ?, 
          montoPenalizacion = ?, 
          motivoPenalizacion = ?
      WHERE id = ?
    `);
    stmt.run(
      campos.estado || cita.estado,
      penalizacion.aplicarPenalizacion ? 1 : 0,
      penalizacion.montoPenalizacion || 0,
      penalizacion.motivo || '',
      id
    );

    return module.exports.obtenerCitaPorId(id);
  },

  obtenerCitaPorId: (id) => {
    const r = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
    if (!r) return null;
    return {
      ...r,
      penalizacion: r.penalizacionAplicada ? {
        aplicarPenalizacion: true,
        montoPenalizacion: r.montoPenalizacion,
        motivo: r.motivoPenalizacion
      } : null
    };
  }
};
