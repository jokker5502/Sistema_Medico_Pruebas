const express = require('express');
const path = require('path');
const db = require('./db/database');
const {
  validarReglaEdad,
  validarRestriccionHorario,
  validarChoqueCitas,
  evaluarPenalizacionCancelacion
} = require('./rules/reglasCitas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 1. Obtener lista de médicos
app.get('/api/medicos', (req, res) => {
  res.json({ success: true, data: db.getMedicos() });
});

// 2. Obtener lista de citas
app.get('/api/citas', (req, res) => {
  res.json({ success: true, data: db.getCitas() });
});

// 3. Crear una nueva cita con validación estricta de Reglas 1, 2 y 3
app.post('/api/citas', (req, res) => {
  const { pacienteId, pacienteNombre, edad, medicoId, fechaHora, motivoConsulta } = req.body;

  if (!pacienteId || !pacienteNombre || edad === undefined || !medicoId || !fechaHora) {
    return res.status(400).json({
      success: false,
      error: 'Todos los campos obligatorios deben ser proporcionados.'
    });
  }

  const medicos = db.getMedicos();
  const medico = medicos.find(m => m.id === Number(medicoId));
  if (!medico) {
    return res.status(404).json({ success: false, error: 'Médico no encontrado' });
  }

  // --- REGLA 1: Validación Pediátrica vs Adulta ---
  const validacionEdad = validarReglaEdad(Number(edad), medico.especialidad);
  if (!validacionEdad.valido) {
    return res.status(422).json({
      success: false,
      regla: 'REGLA_1_EDAD',
      error: validacionEdad.motivo
    });
  }

  // --- REGLA 2: Restricción de Horarios ---
  const validacionHorario = validarRestriccionHorario(fechaHora);
  if (!validacionHorario.valido) {
    return res.status(422).json({
      success: false,
      regla: 'REGLA_2_HORARIO',
      error: validacionHorario.motivo
    });
  }

  // --- REGLA 3: Choque de Citas (Prevención de doble reserva) ---
  const citasExistentes = db.getCitas();
  const validacionChoque = validarChoqueCitas(
    {
      medicoId: Number(medicoId),
      pacienteId: Number(pacienteId),
      fechaHora
    },
    citasExistentes
  );

  if (!validacionChoque.valido) {
    return res.status(409).json({
      success: false,
      regla: 'REGLA_3_CHOQUE',
      error: validacionChoque.motivo
    });
  }

  // Si todas las reglas de caja blanca son válidas, guardar en SQLite
  const nuevaCita = db.agregarCita({
    pacienteId: Number(pacienteId),
    pacienteNombre,
    edad: Number(edad),
    medicoId: Number(medicoId),
    medicoNombre: medico.nombre,
    especialidad: medico.especialidad,
    fechaHora,
    motivoConsulta: motivoConsulta || 'Consulta médica general'
  });

  return res.status(201).json({
    success: true,
    message: 'Cita médica agendada exitosamente tras pasar todas las auditorías de reglas.',
    data: nuevaCita
  });
});

// 4. Cancelar cita evaluando REGLA 4: Penalización Tardía
app.post('/api/citas/:id/cancelar', (req, res) => {
  const { id } = req.params;
  const { esEmergencia } = req.body;

  const cita = db.obtenerCitaPorId(id);
  if (!cita) {
    return res.status(404).json({ success: false, error: 'Cita no encontrada.' });
  }

  if (cita.estado === 'CANCELADA') {
    return res.status(400).json({ success: false, error: 'Esta cita ya se encuentra cancelada.' });
  }

  // Calcular diferencia de horas entre el momento actual y la cita
  const ahora = new Date().getTime();
  const fechaCita = new Date(cita.fechaHora).getTime();
  const diferenciaHoras = (fechaCita - ahora) / (1000 * 60 * 60);

  // --- REGLA 4: Evaluación de Penalización ---
  const resultadoPenalizacion = evaluarPenalizacionCancelacion(diferenciaHoras, Boolean(esEmergencia));

  const citaActualizada = db.actualizarCita(id, {
    estado: 'CANCELADA',
    fechaCancelacion: new Date().toISOString(),
    penalizacion: resultadoPenalizacion
  });

  return res.json({
    success: true,
    message: 'Cita cancelada con éxito.',
    penalizacion: resultadoPenalizacion,
    data: citaActualizada
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(` Servidor de Citas Médicas corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
