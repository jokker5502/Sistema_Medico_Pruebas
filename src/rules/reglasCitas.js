/**
 * Reglas de Negocio Críticas para el Sistema de Citas Médicas
 * Auditables mediante Caja Blanca y Complejidad Ciclomática de McCabe V(G)
 */

/**
 * REGLA 1: Validación Pediátrica vs. Adulta
 * 
 * Topología:
 * - P1: edad < 0 || isNaN(edad) -> Entrada inválida
 * - P2: edad < 18 (Pediátrico)
 *     - P3: especialidadMedico !== 'Pediatria' -> Rechazo
 * - Adulto (edad >= 18)
 *     - P4: especialidadMedico === 'Pediatria' -> Rechazo
 * 
 * V(G) = P + 1 = 4 + 1 = 5 caminos independientes.
 */
function validarReglaEdad(edad, especialidadMedico) {
  if (typeof edad !== 'number' || isNaN(edad) || edad < 0) {
    return { valido: false, motivo: 'Edad inválida' };
  }

  const esPediatrico = edad < 18;

  if (esPediatrico) {
    if (especialidadMedico !== 'Pediatria') {
      return { valido: false, motivo: 'Pacientes pediátricos solo pueden ser atendidos por Pediatría' };
    }
  } else {
    if (especialidadMedico === 'Pediatria') {
      return { valido: false, motivo: 'Pacientes adultos no pueden ser atendidos por Pediatría' };
    }
  }

  return { valido: true, motivo: 'Asignación correcta por grupo de edad' };
}

/**
 * REGLA 2: Restricción de Horarios (Bloqueo de franjas no operativas)
 * Horario operativo: Lunes a Viernes, de 08:00 a 18:00 (hora local).
 * 
 * Topología:
 * - P1: Fecha inválida
 * - P2: Fin de semana (diaSemana === 0 || diaSemana === 6)
 * - P3: Hora fuera de rango (hora < 8 || hora >= 18)
 * 
 * V(G) = P + 1
 */
function validarRestriccionHorario(fechaHoraIso) {
  const fecha = new Date(fechaHoraIso);
  if (isNaN(fecha.getTime())) {
    return { valido: false, motivo: 'Fecha u hora inválida' };
  }

  const diaSemana = fecha.getDay(); // 0: Domingo, 6: Sábado
  if (diaSemana === 0 || diaSemana === 6) {
    return { valido: false, motivo: 'Cita fuera de días operativos (sábados y domingos cerrados)' };
  }

  const hora = fecha.getHours();
  if (hora < 8 || hora >= 18) {
    return { valido: false, motivo: 'Cita fuera de horario operativo (atención de 08:00 a 18:00)' };
  }

  return { valido: true, motivo: 'Horario operativo válido' };
}

/**
 * REGLA 3: Choque de Citas (Prevención de doble reserva)
 * Valida si un médico o paciente ya tiene una cita activa en el mismo horario.
 * 
 * Topología:
 * - Itera las citas existentes:
 *   - P1: cita.estado === 'CANCELADA' -> omitir
 *   - P2: cita.medicoId === nuevaCita.medicoId && fecha coincide -> conflicto médico
 *   - P3: cita.pacienteId === nuevaCita.pacienteId && fecha coincide -> conflicto paciente
 */
function validarChoqueCitas(nuevaCita, citasExistentes = []) {
  if (!nuevaCita || !nuevaCita.fechaHora || !nuevaCita.medicoId || !nuevaCita.pacienteId) {
    return { valido: false, motivo: 'Datos de la nueva cita incompletos' };
  }

  const fechaNueva = new Date(nuevaCita.fechaHora).getTime();

  for (const cita of citasExistentes) {
    if (cita.estado === 'CANCELADA') {
      continue;
    }

    const fechaExistente = new Date(cita.fechaHora).getTime();
    if (fechaExistente === fechaNueva) {
      if (cita.medicoId === nuevaCita.medicoId) {
        return { valido: false, motivo: 'El médico ya tiene una cita reservada en este horario' };
      }
      if (cita.pacienteId === nuevaCita.pacienteId) {
        return { valido: false, motivo: 'El paciente ya cuenta con otra cita en este mismo horario' };
      }
    }
  }

  return { valido: true, motivo: 'No existen choques de horario' };
}

/**
 * REGLA 4: Penalización Tardía (< 24h)
 * Extraída directamente del Taller Paso 1 (Lámina 8):
 * 
 * if (cancelacionTardia && !esEmergencia) {
 *     aplicarPenalizacion();
 * }
 * 
 * Nodos Predicado: 2 (cancelacionTardia y !esEmergencia)
 * V(G) = P + 1 = 2 + 1 = 3 caminos independientes:
 * 1. cancelacionTardia = False -> Sin penalización
 * 2. cancelacionTardia = True & !esEmergencia = False (esEmergencia = True) -> Exonerado
 * 3. cancelacionTardia = True & !esEmergencia = True (esEmergencia = False) -> Aplica penalización
 */
function evaluarPenalizacionCancelacion(horasParaCita, esEmergencia = false) {
  const cancelacionTardia = horasParaCita < 24;

  if (cancelacionTardia && !esEmergencia) {
    return {
      aplicarPenalizacion: true,
      montoPenalizacion: 15.00,
      motivo: 'Cancelación con menos de 24 horas sin justificación de emergencia médica'
    };
  }

  if (cancelacionTardia && esEmergencia) {
    return {
      aplicarPenalizacion: false,
      montoPenalizacion: 0,
      motivo: 'Cancelación tardía justificada por emergencia médica (exonerado)'
    };
  }

  return {
    aplicarPenalizacion: false,
    montoPenalizacion: 0,
    motivo: 'Cancelación realizada con la debida anticipación (>= 24h)'
  };
}

module.exports = {
  validarReglaEdad,
  validarRestriccionHorario,
  validarChoqueCitas,
  evaluarPenalizacionCancelacion
};
