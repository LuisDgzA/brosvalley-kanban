# Spec — Multiples responsables, tags por proyecto y notificaciones de asignacion

Estado: Proposed  
Prioridad fuente: Alta  
Origen: solicitud funcional 2026-05-22  
Relaciona y extiende: `03-colaboracion-y-trazabilidad.md`, `04-plantillas-y-etiquetas.md`, `05-notificaciones-y-kpis.md`, `08-control-de-acceso-y-hardening-operativo.md`

## Modulo

Este modulo cubre:

- multiples responsables por tarea;
- notificaciones in-app cuando una tarea es asignada;
- navegacion de notificaciones al tablero y tarea correctos;
- tags definidos por proyecto;
- relacion tematica entre tareas por medio de tags compartidos.

## Problema

Hoy cada tarea funciona con un solo `assigned_to`, lo cual limita trabajo compartido entre varias personas. Tampoco existe una notificacion persistente y accionable cuando una persona es asignada a una tarea. Ademas, faltan tags visuales por proyecto para agrupar tareas por tema, iniciativa o area especifica sin depender del nombre de la tarea.

## Objetivo

Permitir colaboracion real sobre una misma tarea, mejorar reaccion operativa con notificaciones utiles y agregar una taxonomia visual por proyecto para conectar tareas relacionadas por un mismo tema.

## Alcance incluido

- una tarea puede tener cero, uno o varios responsables;
- los responsables elegibles deben pertenecer al proyecto;
- cada nuevo responsable recibe notificacion in-app de asignacion;
- la notificacion debe abrir el `kanban` del proyecto y, si existe drawer de detalle, abrir la tarea correcta;
- cada proyecto puede definir su propio catalogo de tags;
- una tarea puede tener cero, uno o varios tags del proyecto;
- cada tag guarda al menos texto y color;
- los tags deben verse como badges en vistas de tareas;
- los tags deben servir para relacionar visual y funcionalmente tareas del mismo tema;
- miembros del proyecto con permiso de gestion operativa pueden crear y usar tags.

## Alcance excluido

- dependencias formales entre tareas tipo `bloquea` o `depende de`;
- menciones, push mobile o email en esta fase;
- taxonomias globales compartidas entre todos los proyectos;
- automatizaciones complejas por tag;
- jerarquias de tags o sub-tags;
- asignacion por grupos o equipos automaticos.

## 1. Multiples responsables por tarea

### Objetivo

Permitir que varias personas colaboren formalmente sobre una misma tarea sin duplicarla.

### Decision de modelo

La asignacion multiple debe modelarse con una relacion aparte y no con una lista serializada dentro de `tasks`.

### Datos requeridos

Nueva tabla sugerida: `task_assignees`

- `id`
- `task_id`
- `user_id`
- `assigned_by`
- `assigned_at`
- `deleted_at` opcional si se conserva patron de soft delete

### Regla de compatibilidad

- `tasks.assigned_to` debe considerarse campo legado durante la migracion;
- al inicio puede mantenerse como compatibilidad temporal para vistas viejas;
- la fuente de verdad nueva debe ser `task_assignees`;
- se recomienda backfill: si una tarea tiene `assigned_to`, crear un registro inicial en `task_assignees`;
- una vez migrado frontend y reportes, `assigned_to` puede eliminarse o redefinirse como responsable principal solo si el producto lo necesita explicitamente.

### Reglas de negocio

- una tarea puede tener cero o muchos responsables;
- no debe haber duplicados de `task_id + user_id`;
- solo se puede asignar a usuarios miembros activos del proyecto;
- al cambiar de proyecto una tarea, sus responsables deben revalidarse contra el nuevo proyecto;
- si un miembro sale del proyecto, el sistema debe impedir inconsistencias y exigir removerlo o reasignarlo en las tareas activas;
- los responsables comparten la misma responsabilidad operativa sobre la tarea;
- en esta fase no existe distincion funcional entre responsable principal y secundario.

### Actividad y auditoria

La actividad ya no debe depender de un unico `task_assignee_changed`. Se recomienda registrar:

- `task_assignee_added`
- `task_assignee_removed`
- `task_assignees_replaced` opcional para operaciones masivas

Cada evento debe guardar suficiente metadata para mostrar nombres de usuarios en lenguaje legible.

### UI esperada

- en crear o editar tarea, usar selector multiple de responsables;
- el selector debe listar solo miembros del proyecto actual;
- en la tarjeta del Kanban debe verse stack de avatars o lista compacta de responsables;
- en el drawer de tarea debe mostrarse la lista completa de responsables;
- filtros como `Mis tareas` deben incluir cualquier tarea donde el usuario aparezca en `task_assignees`.

### Criterios de aceptacion

- una tarea puede guardarse con varios responsables;
- todos los responsables guardados pertenecen al proyecto;
- una tarea sin responsables sigue siendo valida;
- al abrir el tablero se muestran todos los responsables de forma clara;
- la auditoria registra altas y bajas de responsables sin ambiguedad.

## 2. Notificaciones de asignacion

### Objetivo

Avisar a cada usuario cuando fue agregado como responsable de una tarea y permitir accion inmediata desde la notificacion.

### Decision de producto

La notificacion de asignacion debe ser persistente y por usuario. No debe depender solo de calculos temporales en frontend ni de `localStorage`.

### Datos requeridos

Nueva tabla sugerida: `user_notifications`

- `id`
- `recipient_user_id`
- `type`
- `title`
- `body`
- `project_id`
- `task_id`
- `payload` jsonb opcional
- `read_at`
- `created_at`

Tipos iniciales sugeridos:

- `task_assigned`
- `task_due_soon` si despues se quiere unificar el sistema actual
- `task_overdue` si despues se quiere unificar el sistema actual

### Evento disparador

Se crea una notificacion `task_assigned` cuando un usuario:

- es agregado por primera vez a una tarea;
- vuelve a ser agregado despues de haber sido removido.

No debe crearse una notificacion nueva cuando:

- el usuario ya estaba asignado y solo se edita otro campo de la tarea;
- se reordena la misma lista sin cambios reales;
- la operacion genera duplicados tecnicos.

### Contenido minimo

La notificacion debe incluir:

- titulo de la tarea;
- nombre del proyecto;
- nombre del usuario que asigno, si esta disponible;
- fecha y hora de asignacion;
- destino de navegacion con `projectId` y `taskId`.

### Navegacion requerida

Al hacer click:

- debe navegar a `/kanban?projectId=<project_id>&taskId=<task_id>`;
- el tablero debe cargar el proyecto correcto;
- el drawer de detalle debe abrir la tarea correcta;
- si el usuario ya no tiene acceso, la notificacion debe marcarse como inaccesible o resolverse sin romper la UI.

### UI esperada

- la campana de notificaciones debe mostrar asignaciones no leidas;
- cada item debe mostrar titulo, proyecto y estado de lectura;
- debe existir accion de marcar como leida;
- si convive con alertas por vencimiento, la UI debe diferenciar claramente ambos tipos.

### Criterios de aceptacion

- al asignar una tarea a uno o varios usuarios, cada nuevo usuario recibe su propia notificacion;
- la notificacion aparece aunque el usuario cierre sesion y vuelva despues;
- al hacer click se abre el tablero y la tarea correspondientes;
- el sistema no crea duplicados por el mismo evento de asignacion;
- un usuario no recibe notificacion sobre recursos que no puede abrir.

## 3. Tags por proyecto

### Objetivo

Permitir que cada proyecto defina sus propios tags visuales para conectar tareas por tema, iniciativa, area o flujo operativo.

### Decision de producto

Los tags deben ser locales al proyecto, no globales. Eso evita mezclar vocabularios entre proyectos distintos.

### Datos requeridos

Nueva tabla sugerida: `project_tags`

- `id`
- `project_id`
- `label`
- `color`
- `created_by`
- `created_at`
- `updated_at`
- `deleted_at` o `archived_at` recomendado

Relacion sugerida: `task_tags`

- `id`
- `task_id`
- `project_tag_id`
- `created_by`
- `created_at`

### Reglas de negocio

- un tag pertenece a un solo proyecto;
- una tarea solo puede usar tags de su propio proyecto;
- `label` debe ser obligatorio y corto;
- `color` debe guardarse de forma estable, recomendado: valor hex canonico;
- no debe haber dos tags activos con el mismo `label` dentro del mismo proyecto, idealmente con comparacion case-insensitive;
- archivar un tag debe impedir nuevas asignaciones, pero no romper historial de tareas antiguas;
- una tarea puede tener varios tags;
- los tags son el mecanismo inicial para relacionar tareas por tema comun, sin necesidad de una tabla de dependencias.

### Permisos

En esta fase pueden crear, editar, archivar y asignar tags:

- `owner` del proyecto;
- `collaborator` del proyecto, si el producto mantiene este rol como miembro operativo con permiso de edicion.

Si despues se introduce un rol mas fino, este spec debe reinterpretarse como `miembro con permiso de editar tareas y configuracion ligera del proyecto`.

### UI esperada

- en el formulario de tarea debe existir selector multiple de tags del proyecto;
- cada tag debe mostrarse con su color real en la tarjeta y en el drawer;
- en el proyecto debe existir una vista simple o modal para administrar tags;
- al crear un tag se elige texto y color con preview visual;
- deben existir filtros por tag en Kanban y, cuando aplique, en vistas de operacion.

### Relacion entre tareas por tema

Los tags deben habilitar al menos estas lecturas:

- ver todas las tareas con el mismo tag dentro del proyecto;
- filtrar el tablero por uno o varios tags;
- entender rapidamente que tareas pertenecen al mismo frente o tema.

Esto cubre la necesidad de "relacionar un tema entre tareas" sin introducir aun un grafo de dependencias.

### Criterios de aceptacion

- un miembro autorizado del proyecto puede crear un tag con texto y color;
- el tag queda disponible solo dentro de ese proyecto;
- una tarea puede tener multiples tags;
- los tags se muestran visualmente en las tareas;
- el usuario puede filtrar tareas por tag;
- abrir un tag permite encontrar tareas relacionadas por ese mismo tema.

## 4. Cambios tecnicos sugeridos

### Base de datos

- crear `task_assignees`;
- crear `project_tags`;
- crear `task_tags`;
- crear `user_notifications`;
- agregar indices por `task_id`, `user_id`, `project_id` y `read_at` donde aplique;
- extender RLS para que:
  - solo miembros del proyecto lean y editen asignaciones y tags del proyecto;
  - solo el receptor lea y marque sus notificaciones;
  - solo miembros con acceso a la tarea puedan crear relaciones de tags y responsables;
- agregar triggers o funciones para:
  - validar que responsables pertenecen al proyecto;
  - validar que tags pertenecen al mismo proyecto de la tarea;
  - generar `task_assigned` al insertar en `task_assignees`.

### Frontend

- migrar formularios de tarea de selector simple a selector multiple de responsables;
- actualizar tarjetas, drawer, home, operaciones y KPIs donde hoy se usa `assigned_to`;
- ampliar campana de notificaciones para leer desde `user_notifications`;
- mantener compatibilidad temporal con notificaciones de vencimiento actuales mientras se migra.

### Consultas y reportes

- toda vista de `Mis tareas` debe consultar por relacion `task_assignees`;
- metricas por responsable deben contar tareas donde el usuario este asignado;
- debe definirse si una tarea con 3 responsables cuenta 1 vez por usuario o se deduplica segun el KPI.

## 5. Estrategia de rollout sugerida

1. crear modelo `task_assignees` y backfill desde `assigned_to`;
2. mover lectura y edicion del Kanban a asignacion multiple;
3. agregar `user_notifications` y disparo de `task_assigned`;
4. conectar navegacion exacta al tablero y drawer;
5. crear `project_tags` y `task_tags`;
6. habilitar filtros y visualizacion de tags;
7. revisar KPIs y vistas derivadas para evitar regresiones.

## 6. Riesgos

- dejar `assigned_to` y `task_assignees` activos demasiado tiempo puede duplicar logica;
- notificaciones sin deduplicacion pueden generar ruido;
- tags libres sin reglas minimas pueden fragmentar el vocabulario del proyecto;
- remover miembros del proyecto sera mas delicado si tienen muchas tareas compartidas;
- algunos KPIs actuales pueden sobrecontar carga si no se redefine el criterio para asignacion multiple.

## 7. Decisiones abiertas recomendadas

- si `assigned_to` se elimina por completo o queda como `primary_assignee_id`;
- si los `collaborator` pueden administrar tags o solo usarlos;
- si archivar un tag debe ocultarlo de tarjetas antiguas o solo impedir nuevas asignaciones;
- si las notificaciones de vencimiento actuales migran tambien a `user_notifications` en la misma fase.

