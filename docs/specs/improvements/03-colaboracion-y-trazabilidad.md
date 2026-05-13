# Spec — Colaboracion y trazabilidad

Estado: Proposed  
Prioridad fuente: Alta  
Origen: `PROJECT_IMPROVEMENTS.md`

## Modulo

Este modulo cubre:

- comentarios por tarea;
- actividad de tarea.

## Problema

Hoy el seguimiento depende demasiado del estado actual de la tarea y posiblemente de conversaciones externas. Falta contexto historico para saber:

- quien cambio que;
- cuando se reasigno algo;
- por que una tarea se movio;
- que notas operativas existen.

## Objetivo

Agregar trazabilidad ligera sin volver el sistema pesado.

## Alcance incluido

- comentarios cortos en tareas;
- timeline o historial de actividad;
- eventos automaticos de cambios relevantes;
- notas operativas visibles dentro del detalle de tarea.

## Alcance excluido

- chat en tiempo real completo;
- menciones complejas;
- archivos adjuntos en primera fase;
- notificaciones sociales avanzadas.

## 1. Comentarios de tarea

### Objetivo

Guardar notas cortas y contexto operativo por tarea.

### Datos requeridos

- id;
- task_id;
- author_id;
- body;
- created_at.

### Reglas de negocio

- el comentario debe requerir texto no vacio;
- debe asociarse a una tarea existente;
- el autor debe quedar persistido;
- una tarea puede tener cero o muchos comentarios.

### UI esperada

- seccion de comentarios dentro del drawer o detalle de tarea;
- orden cronologico descendente o ascendente definido y consistente;
- formulario simple para agregar comentario.

### Criterios de aceptacion

- el usuario puede crear comentario desde una tarea;
- los comentarios quedan visibles al volver a abrir la tarea;
- la ausencia de comentarios se muestra claramente.

## 2. Actividad de tarea

### Objetivo

Registrar cambios importantes sin depender del frontend como unica memoria.

### Eventos minimos sugeridos

- cambio de status;
- cambio de responsable;
- cambio de prioridad;
- edicion de fecha limite;
- creacion de tarea.

### Datos requeridos

- id;
- task_id;
- actor_id;
- event_type;
- old_value opcional;
- new_value opcional;
- created_at.

### Reglas de negocio

- la actividad debe registrar cambios estructurados, no solo texto libre;
- los cambios automaticos no sustituyen a comentarios manuales;
- una actividad debe poder mostrarse en lenguaje legible.

### UI esperada

- timeline de actividad por tarea;
- eventos resumidos de forma entendible;
- separacion clara entre comentario y evento automatico.

### Criterios de aceptacion

- cambiar status genera actividad;
- reasignar responsable genera actividad;
- editar fecha limite genera actividad;
- la actividad puede consultarse desde la tarea.

## Dependencias tecnicas

- nueva tabla `task_comments`;
- nueva tabla `task_activity`;
- posible uso de triggers o capa de servicio para auditar.

## Riesgos

- si todo se registra como actividad, el timeline pierde legibilidad;
- auditar solo desde frontend es fragil;
- RLS debe cubrir acceso a comentarios y actividad.
