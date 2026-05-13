# Spec — Prioridad y filtros operativos

Estado: Proposed  
Prioridad fuente: Alta  
Origen: `PROJECT_IMPROVEMENTS.md`

## Modulo

Este modulo cubre dos mejoras:

- prioridad en tareas;
- filtros rapidos de operacion.

## Problema

El sistema actual permite ver tareas por estado, pero no ayuda lo suficiente a responder:

- que debe hacerse primero;
- que esta vencido;
- que no tiene responsable;
- que merece atencion esta semana.

## Objetivo

Permitir priorizacion rapida y foco operativo diario.

## Alcance incluido

- campo `priority` en tareas;
- visualizacion de prioridad en Kanban y tablas;
- filtros predefinidos:
  - `Vencidas`
  - `Sin asignar`
  - `Esta semana`
  - `Por revisar`

## Alcance excluido

- reglas automaticas de prioridad;
- SLAs complejos;
- scoring dinamico multicriterio.

## 1. Prioridad en tareas

### Valores soportados

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### Reglas de negocio

- toda tarea nueva debe tener prioridad, aunque la primera version puede defaultar a `MEDIUM`;
- la prioridad debe ser editable;
- la prioridad no sustituye el status, lo complementa;
- en vistas operativas, `CRITICAL` y `HIGH` deben destacar visualmente.

### UX esperada

- badge o tag visible en la tarjeta de tarea;
- filtro por prioridad;
- orden recomendado por prioridad y fecha limite.

### Criterios de aceptacion

- una tarea puede crearse y editarse con prioridad;
- Kanban y tablas muestran la prioridad;
- se puede filtrar por prioridad sin ambiguedad.

## 2. Filtros rapidos

### Definiciones

- `Vencidas`: `due_date < hoy` y status distinto de `DONE`
- `Sin asignar`: `assigned_to is null`
- `Esta semana`: `due_date` dentro de los proximos 7 dias y status distinto de `DONE`
- `Por revisar`: status `IN_REVIEW`

### Lugares de uso esperados

- Kanban;
- dashboard;
- lista de tareas o vistas operativas futuras.

### UX esperada

- botones o chips de un click;
- combinables con filtro de proyecto si es posible;
- contador visible por filtro cuando agregue valor.

### Criterios de aceptacion

- cada filtro devuelve el subconjunto correcto de tareas;
- el usuario puede activar y limpiar filtros facilmente;
- filtros vacios muestran mensaje claro en vez de pantalla rota.

## Dependencias tecnicas

- agregar columna `priority` en `tasks`;
- indexar si el volumen crece;
- revisar selects y tipos de frontend.

## Riesgos

- exceso de señales visuales en Kanban;
- definir mal `Esta semana` puede causar confusion si no se aclara timezone;
- sin criterio comun de prioridad, los datos pierden valor rapido.
