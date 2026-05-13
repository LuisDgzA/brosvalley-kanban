# Spec — Operacion visible

Estado: Proposed  
Prioridad fuente: Alta  
Origen: `PROJECT_IMPROVEMENTS.md`

## Modulo

Este modulo cubre dos mejoras:

- resumen semanal por proyecto;
- vista de responsables.

## Problema

Hoy el sistema permite ver proyectos y tareas, pero no responde lo bastante rapido:

- que proyecto esta en riesgo esta semana;
- quien esta cargado de trabajo;
- donde hay vencimientos, bloqueos o cuellos de botella.

## Objetivo

Dar una lectura operativa simple para direccion y operaciones sin obligar a navegar proyecto por proyecto.

## Alcance incluido

- resumen semanal por proyecto;
- vista por colaborador o responsable;
- indicadores de riesgo operativo;
- lista de tareas vencidas, por vencer y bloqueadas;
- carga actual por responsable.

## Alcance excluido

- forecasting avanzado;
- planeacion de capacidad compleja;
- distribucion automatica de tareas;
- reportes exportables avanzados.

## Usuarios

- direccion;
- operaciones;
- lideres de proyecto;
- responsables individuales.

## 1. Resumen semanal por proyecto

### Objetivo

Mostrar de forma inmediata el estado operativo de cada proyecto.

### Datos requeridos

- proyecto;
- total de tareas;
- tareas vencidas;
- tareas por vencer esta semana;
- tareas bloqueadas;
- tareas en revision;
- avance general.

### Reglas de negocio

- `vencida`: tarea con `due_date` anterior a hoy y status distinto de `DONE`.
- `por vencer`: tarea con `due_date` entre hoy y los proximos 7 dias y status distinto de `DONE`.
- `bloqueada`: depende de contar con `blocked_reason` o equivalente.
- `avance`: porcentaje de tareas `DONE` sobre total.

### UI esperada

- tabla o tarjetas por proyecto;
- semaforo de riesgo por proyecto;
- accesos rapidos a tareas en riesgo;
- lectura clara para junta semanal.

### Criterios de aceptacion

- cada proyecto muestra conteo de vencidas, por vencer y bloqueadas;
- el usuario puede identificar proyectos en riesgo en menos de 30 segundos;
- si no hay tareas, el proyecto no rompe la vista y muestra estado vacio util.

## 2. Vista de responsables

### Objetivo

Mostrar la carga actual por colaborador.

### Datos requeridos

- responsable;
- tareas abiertas;
- tareas vencidas;
- tareas proximas a vencer;
- proyectos activos donde participa.

### Reglas de negocio

- `tareas abiertas`: status distinto de `DONE`.
- la carga debe contemplar tareas asignadas, no solo membresia de proyecto.
- una tarea sin `assigned_to` no cuenta para ningun responsable.

### UI esperada

- listado por colaborador;
- resumen numerico por persona;
- opcion de entrar al detalle de sus tareas;
- orden por mayor carga o mayor riesgo.

### Criterios de aceptacion

- el sistema lista responsables con al menos carga abierta y proximas fechas;
- el usuario puede detectar responsables saturados o sin carga;
- la vista funciona aunque haya perfiles sin tareas asignadas.

## Dependencias tecnicas

- `priority` ayuda pero no es obligatoria para primera version.
- `blocked_reason` es clave para detectar bloqueo de forma estructurada.
- puede requerir joins `tasks -> profiles -> projects`.

## Riesgos

- sin campo formal de bloqueo la lectura sera incompleta;
- demasiadas metricas pueden volver la vista confusa;
- si RLS cambia, puede limitar lectura transversal.
