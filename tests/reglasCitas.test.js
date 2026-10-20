/**
 * SUITE DE AUDITORÍA DE CAJA BLANCA - PRUEBAS ESTRUCTURALES
 * Cumpliendo los criterios de la Complejidad Ciclomática de McCabe V(G),
 * Cobertura de Ramas (Branch Coverage 100%) y Oráculos Estrictos (Modelo PIE).
 */

const {
  validarReglaEdad,
  validarRestriccionHorario,
  validarChoqueCitas,
  evaluarPenalizacionCancelacion
} = require('../src/rules/reglasCitas');

describe('AUDITORÍA DE REGLAS DE NEGOCIO CRÍTICAS (CAJA BLANCA)', () => {

  // =========================================================================
  // REGLA 1: Validación Pediátrica vs Adulta
  // =========================================================================
  describe('REGLA 1: validarReglaEdad() [McCabe V(G) = 5]', () => {
    test('Camino 1a: Entrada inválida con edad negativa debe retornar error', () => {
      const res = validarReglaEdad(-5, 'Pediatria');
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe('Edad inválida');
    });

    test('Camino 1b: Entrada inválida con edad string/NaN debe retornar error', () => {
      const resString = validarReglaEdad('quince', 'Pediatria');
      expect(resString.valido).toBe(false);
      expect(resString.motivo).toBe('Edad inválida');

      const resNaN = validarReglaEdad(NaN, 'Pediatria');
      expect(resNaN.valido).toBe(false);
      expect(resNaN.motivo).toBe('Edad inválida');
    });

    test('Camino 2: Niño (<18) con médico especialista en Pediatría debe ser ACEPTADO', () => {
      const res = validarReglaEdad(10, 'Pediatria');
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('Asignación correcta por grupo de edad');
    });

    test('Camino 3: Niño (<18) con médico que NO es Pediatría debe ser RECHAZADO', () => {
      const res = validarReglaEdad(10, 'Medicina Familiar');
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe('Pacientes pediátricos solo pueden ser atendidos por Pediatría');
    });

    test('Camino 4: Adulto (>=18) con médico especialista en Pediatría debe ser RECHAZADO', () => {
      const res = validarReglaEdad(25, 'Pediatria');
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe('Pacientes adultos no pueden ser atendidos por Pediatría');
    });

    test('Camino 5: Adulto (>=18) con médico de Medicina Familiar debe ser ACEPTADO', () => {
      const res = validarReglaEdad(40, 'Medicina Familiar');
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('Asignación correcta por grupo de edad');
    });
  });

  // =========================================================================
  // REGLA 2: Restricción de Horarios
  // =========================================================================
  describe('REGLA 2: validarRestriccionHorario() [McCabe V(G) = 4]', () => {
    test('Camino 1: Formato de fecha inválido debe ser rechazado', () => {
      const res = validarRestriccionHorario('fecha-no-valida');
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe('Fecha u hora inválida');
    });

    test('Camino 2: Cita en Domingo (día 0) o Sábado (día 6) debe ser bloqueada', () => {
      // 2026-10-25 es Domingo
      const resDomingo = validarRestriccionHorario('2026-10-25T10:00:00');
      expect(resDomingo.valido).toBe(false);
      expect(resDomingo.motivo).toContain('sábados y domingos cerrados');

      // 2026-10-24 es Sábado
      const resSabado = validarRestriccionHorario('2026-10-24T10:00:00');
      expect(resSabado.valido).toBe(false);
      expect(resSabado.motivo).toContain('sábados y domingos cerrados');
    });

    test('Camino 3: Cita en día hábil fuera de franja (hora < 8 o hora >= 18)', () => {
      // Miércoles 2026-10-21 a las 07:00
      const resTemprano = validarRestriccionHorario('2026-10-21T07:00:00');
      expect(resTemprano.valido).toBe(false);
      expect(resTemprano.motivo).toContain('atención de 08:00 a 18:00');

      // Miércoles 2026-10-21 a las 18:00 (límite superior de cierre)
      const resCierre = validarRestriccionHorario('2026-10-21T18:00:00');
      expect(resCierre.valido).toBe(false);
      expect(resCierre.motivo).toContain('atención de 08:00 a 18:00');
    });

    test('Camino 4: Cita en día hábil en franja permitida (Miércoles 10:00) debe ser ACEPTADA', () => {
      const res = validarRestriccionHorario('2026-10-21T10:00:00');
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('Horario operativo válido');
    });
  });

  // =========================================================================
  // REGLA 3: Choque de Citas (Prevención de Doble Reserva)
  // =========================================================================
  describe('REGLA 3: validarChoqueCitas() [McCabe V(G) = 5]', () => {
    test('Camino 1: Sub-condiciones booleanas de datos incompletos', () => {
      expect(validarChoqueCitas(null).valido).toBe(false);
      expect(validarChoqueCitas({}).valido).toBe(false);
      expect(validarChoqueCitas({ fechaHora: '2026-10-20' }).valido).toBe(false);
      expect(validarChoqueCitas({ fechaHora: '2026-10-20', medicoId: 1 }).valido).toBe(false);
    });

    test('Camino 2: Si la lista de citas existentes se omite por defecto o está vacía', () => {
      const nuevaCita = { medicoId: 1, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z' };
      const res = validarChoqueCitas(nuevaCita); // Usa parámetro por defecto citasExistentes = []
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('No existen choques de horario');
    });

    test('Camino 3: Citas en fechas distintas no deben generar colisión', () => {
      const nuevaCita = { medicoId: 1, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z' };
      const citasExistentes = [
        { id: 1, medicoId: 1, pacienteId: 102, fechaHora: '2026-10-20T14:00:00.000Z', estado: 'CONFIRMADA' }
      ];
      const res = validarChoqueCitas(nuevaCita, citasExistentes);
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('No existen choques de horario');
    });

    test('Camino 4: Cita previa cancelada en el mismo horario no bloquea la nueva reserva', () => {
      const nuevaCita = { medicoId: 1, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z' };
      const citasExistentes = [
        { id: 9, medicoId: 1, pacienteId: 102, fechaHora: '2026-10-20T10:00:00.000Z', estado: 'CANCELADA' }
      ];
      const res = validarChoqueCitas(nuevaCita, citasExistentes);
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('No existen choques de horario');
    });

    test('Camino 5: Médico ya ocupado en ese horario debe ser BLOQUEADO', () => {
      const nuevaCita = { medicoId: 1, pacienteId: 103, fechaHora: '2026-10-20T10:00:00.000Z' };
      const citasExistentes = [
        { id: 1, medicoId: 1, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z', estado: 'CONFIRMADA' }
      ];
      const res = validarChoqueCitas(nuevaCita, citasExistentes);
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe('El médico ya tiene una cita reservada en este horario');
    });

    test('Camino 6: Paciente ya cuenta con otra cita a esa misma hora (con otro médico)', () => {
      const nuevaCita = { medicoId: 2, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z' };
      const citasExistentes = [
        { id: 1, medicoId: 1, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z', estado: 'CONFIRMADA' }
      ];
      const res = validarChoqueCitas(nuevaCita, citasExistentes);
      expect(res.valido).toBe(false);
      expect(res.motivo).toBe('El paciente ya cuenta con otra cita en este mismo horario');
    });

    test('Camino 7: Misma fecha y hora pero diferente médico y diferente paciente (sin colisión)', () => {
      const nuevaCita = { medicoId: 1, pacienteId: 101, fechaHora: '2026-10-20T10:00:00.000Z' };
      const citasExistentes = [
        { id: 1, medicoId: 3, pacienteId: 999, fechaHora: '2026-10-20T10:00:00.000Z', estado: 'CONFIRMADA' }
      ];
      const res = validarChoqueCitas(nuevaCita, citasExistentes);
      expect(res.valido).toBe(true);
      expect(res.motivo).toBe('No existen choques de horario');
    });
  });

  // =========================================================================
  // REGLA 4: Penalización Tardía (< 24h)
  // =========================================================================
  describe('REGLA 4: evaluarPenalizacionCancelacion() [McCabe V(G) = 3]', () => {
    test('Camino 1: cancelacionTardia = False (horas >= 24h) con y sin segundo parámetro', () => {
      // Con parámetro explícito
      const res = evaluarPenalizacionCancelacion(48, false);
      expect(res.aplicarPenalizacion).toBe(false);
      expect(res.montoPenalizacion).toBe(0);
      expect(res.motivo).toBe('Cancelación realizada con la debida anticipación (>= 24h)');

      // Usando valor por defecto esEmergencia = false
      const resDefault = evaluarPenalizacionCancelacion(30);
      expect(resDefault.aplicarPenalizacion).toBe(false);
      expect(resDefault.montoPenalizacion).toBe(0);
    });

    test('Camino 2: cancelacionTardia = True & esEmergencia = True -> Exonerado por emergencia médica', () => {
      const res = evaluarPenalizacionCancelacion(5, true);
      expect(res.aplicarPenalizacion).toBe(false);
      expect(res.montoPenalizacion).toBe(0);
      expect(res.motivo).toContain('justificada por emergencia médica');
    });

    test('Camino 3: cancelacionTardia = True & esEmergencia = False -> Aplica penalización $15.00', () => {
      const res = evaluarPenalizacionCancelacion(12, false);
      expect(res.aplicarPenalizacion).toBe(true);
      expect(res.montoPenalizacion).toBe(15.00);
      expect(res.motivo).toContain('sin justificación de emergencia médica');
    });
  });

});
