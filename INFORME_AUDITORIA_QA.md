# INFORME DE AUDITORÍA DE CALIDAD Y PRUEBAS DE CAJA BLANCA
## Sistema de Citas Médicas - Clínica Familiar
**Materia:** Calidad y Pruebas de Software / Auditoría de Sistemas  
**Enfoque Pedagógico:** *Auditando a la IA como Ingenieros de QA (Complejidad Ciclomática de McCabe y Cobertura de Código)*  
**Fecha:** Octubre 2026  

---

## 1. INTRODUCCIÓN Y JUSTIFICACIÓN PEDAGÓGICA

En la era del desarrollo asistido por Inteligencia Artificial, cualquier modelo generativo puede escribir un backend completo en cuestión de segundos. Sin embargo, aceptar ciegamente este código sin validación estructural representa uno de los mayores riesgos en la ingeniería de software moderna:

* **El Desarrollador Copiador:** Acepta el primer output, asume que compilar equivale a funcionar correctamente y confía en reportes automáticos de 100% de cobertura sin inspeccionar las aserciones.
* **El Ingeniero QA Auditor:** Analiza la topología del código, calcula matemáticamente los caminos lógicos posibles mediante la **Complejidad Ciclomática de McCabe ($V(G)$)**, detecta el peligro de los "tests zombi" (Modelo PIE) y exige pruebas unitarias con oráculos estrictos y **Cobertura de Ramas (Branch Coverage)** completa.

Este informe documenta la auditoría formal de caja blanca sobre el **Backend de Citas de Médico Familiar**, construido en Node.js (Express), SQLite nativo y Alpine.js.

---

## 2. ARQUITECTURA DEL SISTEMA Y TECNOLOGÍAS

```
sistema-citas-medicas/
├── data/
│   └── citas_medicas.db         # Base de datos persistente SQLite (node:sqlite)
├── public/
│   └── index.html               # Frontend interactivo con Alpine.js y Tailwind CSS
├── src/
│   ├── db/
│   │   └── database.js          # Acceso a datos SQLite (médicos y citas)
│   ├── rules/
│   │   └── reglasCitas.js       # Las 4 Reglas de Negocio Críticas (Módulos Puros)
│   └── server.js                # Servidor Express y endpoints de la API REST
├── tests/
│   └── reglasCitas.test.js      # Suite Jest con 100% Branch Coverage y Oráculos Estrictos
├── package.json
└── INFORME_AUDITORIA_QA.md      # Este informe
```

---

## 3. AUDITORÍA TOPOLÓGICA Y CÁLCULO DE McCABE $V(G)$

Se auditaron matemáticamente las 4 reglas críticas de negocio aisladas en [`src/rules/reglasCitas.js`](file:///c:/Users/mvill/OneDrive/Desktop/sistema-citas-medicas/src/rules/reglasCitas.js).

### Regla 1: Validación Pediátrica vs. Adulta (`validarReglaEdad`)
* **Regla de Negocio:** 
  1. Si la edad es menor de 18 años, el paciente únicamente puede ser asignado a la especialidad `Pediatria`.
  2. Si la edad es mayor o igual a 18 años, el paciente no puede ser asignado a `Pediatria`.
  3. Edades negativas o no numéricas deben ser rechazadas de inmediato.
* **Nodos Predicado ($P$):**
  * $P_1$: ¿Edad menor a 0 o no numérica?
  * $P_2$: ¿Edad menor a 18 (Pediátrico)?
  * $P_3$: Si es pediátrico, ¿médico !== 'Pediatria'?
  * $P_4$: Si es adulto, ¿médico === 'Pediatria'?
* **Cálculo de McCabe:**
  $$V(G) = P + 1 = 4 + 1 = 5$$
* **Total de Caminos Linealmente Independientes:** **5 caminos**.
  * Camino 1: Entrada inválida (edad negativa o NaN) $\rightarrow$ Rechazo.
  * Camino 2: Paciente $< 18$ con Pediatra $\rightarrow$ Aprobado.
  * Camino 3: Paciente $< 18$ con Médico Familiar $\rightarrow$ Rechazado.
  * Camino 4: Paciente $\ge 18$ con Pediatra $\rightarrow$ Rechazado.
  * Camino 5: Paciente $\ge 18$ con Médico Familiar $\rightarrow$ Aprobado.

---

### Regla 2: Restricción de Horarios (`validarRestriccionHorario`)
* **Regla de Negocio:** Horario de atención clínica de Lunes a Viernes de 08:00 a 18:00. Fines de semana y horas nocturnas/tempranas están bloqueados.
* **Nodos Predicado ($P$):**
  * $P_1$: ¿Fecha inválida?
  * $P_2$: ¿Día de la semana es Sábado o Domingo?
  * $P_3$: ¿Hora menor a 8 o mayor/igual a 18?
* **Cálculo de McCabe:**
  $$V(G) = P + 1 = 3 + 1 = 4$$
* **Total de Caminos Linealmente Independientes:** **4 caminos**.
  * Camino 1: Fecha no parseable $\rightarrow$ Inválido.
  * Camino 2: Cita en Sábado o Domingo $\rightarrow$ Bloqueado.
  * Camino 3: Cita en día hábil fuera de franja (ej. 07:00 o 19:00) $\rightarrow$ Bloqueado.
  * Camino 4: Cita en día hábil en franja de 08:00 a 17:59 $\rightarrow$ Aprobado.

---

### Regla 3: Choque de Citas (`validarChoqueCitas`)
* **Regla de Negocio:** Prevención de doble reserva. Ni el médico ni el paciente pueden tener dos citas simultáneas activas en el mismo intervalo temporal.
* **Nodos Predicado ($P$):**
  * $P_1$: ¿Datos de la cita entrante están incompletos?
  * $P_2$: En el bucle de citas, ¿la cita analizada está en estado 'CANCELADA'? (Se descarta).
  * $P_3$: ¿La fecha y hora coinciden con una cita existente?
  * $P_4$: ¿El médico coincide con la cita existente en ese horario?
  * $P_5$: ¿El paciente coincide con la cita existente en ese horario?
* **Cálculo de McCabe:**
  $$V(G) = 5$$ (Cumple con $V(G) \le 10$, no requiere refactorización adicional).
* **Caminos Auditados:**
  * Camino 1: Datos incompletos $\rightarrow$ Error.
  * Camino 2: Horario libre (o lista vacía) $\rightarrow$ Aprobado.
  * Camino 3: Cita existente cancelada en la misma hora $\rightarrow$ Se permite reserva.
  * Camino 4: Choque por médico ocupado $\rightarrow$ Bloqueado.
  * Camino 5: Choque por paciente con otra cita $\rightarrow$ Bloqueado.
  * Camino 6: Coincidencia de hora pero con diferente médico y diferente paciente $\rightarrow$ Aprobado.

---

### Regla 4: Penalización Tardía (`evaluarPenalizacionCancelacion`)
*(Extraída directamente de la Lámina 8 del taller universitario)*
```javascript
// if (cancelacionTardia && !esEmergencia) { aplicarPenalizacion(); }
```
* **Grafo de Flujo de Control (CFG):**
```
                [Inicio]
                   │
                   ▼
       ¿cancelacionTardia (<24h)?
            /            \
       (False)          (True)
          │                │
          │                ▼
          │         ¿!esEmergencia?
          │            /       \
          │        (False)    (True)
          │           │          │
          │     [Exonerado] [Aplicar Penalización $15]
          │           │          │
          └───────────┼──────────┘
                      ▼
                   [Fin]
```
* **Nodos Predicado ($P$):** 2 (`cancelacionTardia` y `!esEmergencia`).
* **Cálculo de McCabe:**
  $$V(G) = P + 1 = 2 + 1 = 3$$
* **Los 3 Caminos Linealmente Independientes Obligatorios:**
  1. **Camino 1 (`cancelacionTardia = False`):** Cancelación con $\ge 24$ horas $\rightarrow$ Penalización: \$0.
  2. **Camino 2 (`cancelacionTardia = True & esEmergencia = True`):** Menos de 24 horas pero con emergencia médica $\rightarrow$ Penalización: \$0 (Exonerado).
  3. **Camino 3 (`cancelacionTardia = True & esEmergencia = False`):** Menos de 24 horas sin justificación $\rightarrow$ Aplica penalización de \$15.00.

---

## 4. DETECCIÓN DEL "FALSO 100%" Y EL MODELO PIE

El documento de la cátedra alerta sobre el **síndrome del test zombi** (Lámina 9):
* **Execution:** El test ejecuta el código.
* **Infection & Propagation:** El código manipula los datos internamente.
* **Detection (FALLO):** Si el test no tiene aserciones exactas (*oráculos fuertes*), el test termina en verde aunque la lógica esté rota.

### Demostración de Oráculos Estrictos Implementados
En nuestra suite [`tests/reglasCitas.test.js`](file:///c:/Users/mvill/OneDrive/Desktop/sistema-citas-medicas/tests/reglasCitas.test.js), cada test contiene oráculos con comparaciones directas de estado:

```javascript
// Test del Camino 3 de Penalización con Oráculo Estricto:
const res = evaluarPenalizacionCancelacion(12, false);
expect(res.aplicarPenalizacion).toBe(true);
expect(res.montoPenalizacion).toBe(15.00);
expect(res.motivo).toContain('sin justificación de emergencia médica');
```
Si un programador cambia el monto o invierte el booleano, el test **falla inmediatamente**, garantizando la detección del defecto.

---

## 5. RESULTADO DE LA EJECUCIÓN DE COBERTURA (JEST)

Se ejecutó la suite de auditoría con `jest --coverage`. El resultado obtenido en consola es:

```
PASS tests/reglasCitas.test.js
  AUDITORÍA DE REGLAS DE NEGOCIO CRÍTICAS (CAJA BLANCA)
    REGLA 1: validarReglaEdad() [McCabe V(G) = 5]
      √ Camino 1a: Entrada inválida con edad negativa debe retornar error
      √ Camino 1b: Entrada inválida con edad string/NaN debe retornar error
      √ Camino 2: Niño (<18) con médico especialista en Pediatría debe ser ACEPTADO
      √ Camino 3: Niño (<18) con médico que NO es Pediatría debe ser RECHAZADO
      √ Camino 4: Adulto (>=18) con médico especialista en Pediatría debe ser RECHAZADO
      √ Camino 5: Adulto (>=18) con médico de Medicina Familiar debe ser ACEPTADO
    REGLA 2: validarRestriccionHorario() [McCabe V(G) = 4]
      √ Camino 1: Formato de fecha inválido debe ser rechazado
      √ Camino 2: Cita en Domingo (día 0) o Sábado (día 6) debe ser bloqueada
      √ Camino 3: Cita en día hábil fuera de franja (hora < 8 o hora >= 18)
      √ Camino 4: Cita en día hábil en franja permitida (Miércoles 10:00) debe ser ACEPTADA
    REGLA 3: validarChoqueCitas() [McCabe V(G) = 5]
      √ Camino 1: Sub-condiciones booleanas de datos incompletos
      √ Camino 2: Si la lista de citas existentes se omite por defecto o está vacía
      √ Camino 3: Citas en fechas distintas no deben generar colisión
      √ Camino 4: Cita previa cancelada en el mismo horario no bloquea la nueva reserva
      √ Camino 5: Médico ya ocupado en ese horario debe ser BLOQUEADO
      √ Camino 6: Paciente ya cuenta con otra cita a esa misma hora (con otro médico)
      √ Camino 7: Misma fecha y hora pero diferente médico y diferente paciente (sin colisión)
    REGLA 4: evaluarPenalizacionCancelacion() [McCabe V(G) = 3]
      √ Camino 1: cancelacionTardia = False (horas >= 24h) con y sin segundo parámetro
      √ Camino 2: cancelacionTardia = True & esEmergencia = True -> Exonerado por emergencia médica
      √ Camino 3: cancelacionTardia = True & esEmergencia = False -> Aplica penalización $15.00

----------------|---------|----------|---------|---------|-------------------
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------------|---------|----------|---------|---------|-------------------
All files       |     100 |      100 |     100 |     100 |                   
 reglasCitas.js |     100 |      100 |     100 |     100 |                   
----------------|---------|----------|---------|---------|-------------------
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Time:        0.494 s
```

---

## 6. RESPUESTAS AL CUESTIONARIO METACONGNITIVO DE AUDITORÍA (Lámina 12)

| # | Pregunta Metacognitiva | Respuesta del Ingeniero QA Auditor |
|---|------------------------|------------------------------------|
| **1** | **¿Conozco el número exacto de caminos lógicos $V(G)$ antes de leer los tests generados por la IA?** | **Sí.** Se extrajo la topología previa de cada función: Regla 1 tiene 5 caminos, Regla 2 tiene 4 caminos, Regla 3 tiene 5 caminos y Regla 4 tiene exactamente 3 caminos ($V(G)=3$). El número de pruebas no fue arbitrario, sino matemáticamente derivado. |
| **2** | **¿El 100% de cobertura que reporta la herramienta incluye aserciones (oráculos) fuertes?** | **Sí.** Se implementaron oráculos directos en Jest con `toBe(true)`, `toBe(false)`, montos monetarios de penalización (`toBe(15.00)`) y validación de motivos textuales. Ningún test evalúa simplemente si el código "no explotó". |
| **3** | **¿Están evaluadas todas las condiciones lógicas, o solo las líneas de código superficiales?** | **Todas las condiciones lógicas.** Se aplicó el criterio de **Cobertura de Ramas (Branch Coverage: 100%)**, verificando cada rama `True` y `False`, así como cada sub-condición booleana de evaluación en cortocircuito (`&&`, `||`). |
| **4** | **¿He forzado intencionalmente fallos (mutaciones) para verificar si los tests de la IA los detectan?** | **Sí.** Si alteramos artificialmente el operador `horasParaCita < 24` por `horasParaCita <= 24` o invertimos la condición de emergencia, los tests fallan de inmediato en rojo. |
| **5** | **¿Es la complejidad del código generado tan alta que la acción correcta es refactorizar en lugar de testear?** | **No.** La complejidad más alta registrada es $V(G) = 5$ (en Regla 1 y Regla 3), la cual está muy por debajo del umbral de riesgo de McCabe ($V(G) > 10$). El código es modular, limpio y testeable. |

---

## 7. CONCLUSIÓN

El software médico ha sido validado exitosamente. Se demostró de manera práctica y rigurosa que el verdadero valor de un ingeniero de pruebas en la era de la IA no reside en escribir código repetitivo, sino en **auditar rigurosamente su topología, controlar matemáticamente la cobertura y asegurar que el software sea robusto, confiable y a prueba de fallos.**
