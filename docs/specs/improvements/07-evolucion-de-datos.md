# Spec — Evolucion de datos para mejoras

Estado: Proposed  
Prioridad fuente: Alta/Media  
Origen: `PROJECT_IMPROVEMENTS.md`

## Proposito

Traducir las mejoras propuestas a una evolucion concreta del modelo de datos.

Este spec no describe UX por pantalla; describe que cambios estructurales se necesitan para soportar los modulos futuros.

## Cambios propuestos en `tasks`

### Nuevas columnas

- `priority`
- `blocked_reason`
- `estimated_hours`
- `completed_at`

### Uso esperado

- `priority`: priorizacion operativa;
- `blocked_reason`: identificar impedimentos reales;
- `estimated_hours`: lectura ligera de esfuerzo;
- `completed_at`: KPIs y seguimiento temporal.

### Reglas de negocio

- `priority` debe aceptar un conjunto cerrado de valores;
- `blocked_reason` puede ser nulo;
- `estimated_hours` debe ser numero no negativo;
- `completed_at` solo aplica cuando la tarea esta completada.

## Cambios propuestos en `projects`

### Nuevas columnas

- `status`
- `owner_id`
- `health`
- `client_name`

### Uso esperado

- `status`: estado general del proyecto;
- `owner_id`: responsable principal del proyecto;
- `health`: lectura ejecutiva de riesgo;
- `client_name`: contexto comercial u operativo.

### Reglas de negocio

- `owner_id` debe referenciar un perfil valido;
- `health` conviene manejarlo como lista cerrada;
- `status` no debe confundirse con status de tareas.

## Nuevas tablas

### `task_comments`

Campos minimos sugeridos:

- `id`
- `task_id`
- `author_id`
- `body`
- `created_at`

### `task_activity`

Campos minimos sugeridos:

- `id`
- `task_id`
- `actor_id`
- `event_type`
- `old_value`
- `new_value`
- `created_at`

## Relaciones nuevas o reforzadas

- `projects.owner_id -> profiles.id`
- `task_comments.task_id -> tasks.id`
- `task_comments.author_id -> profiles.id`
- `task_activity.task_id -> tasks.id`
- `task_activity.actor_id -> profiles.id`

## Criterios de evolucion

- cada columna nueva debe justificarse por una mejora concreta;
- no agregar campos sin caso de uso claro;
- preferir enums o checks para valores cerrados;
- versionar cambios como migraciones SQL.

## Recomendacion de orden

1. agregar columnas de `tasks`;
2. agregar columnas de `projects`;
3. crear `task_comments`;
4. crear `task_activity`;
5. ajustar tipos frontend;
6. revisar RLS;
7. actualizar specs funcionales dependientes.

## Riesgos

- agregar campos sin UX definida puede inflar el modelo;
- sin auditoria backend `task_activity` puede quedar incompleta;
- `estimated_hours` puede crear expectativas de planeacion mas formal;
- `health` y `status` de proyecto necesitan definiciones cerradas para no degradarse.

## Criterios de aceptacion

- el modelo soporta prioridad, bloqueo, esfuerzo y cierre temporal;
- el modelo soporta ownership y salud de proyecto;
- el modelo soporta comentarios y actividad;
- cada cambio queda migrado y documentado.
