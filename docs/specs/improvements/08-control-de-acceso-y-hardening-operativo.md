# Spec — Control de acceso y hardening operativo

Estado: Proposed  
Prioridad fuente: Muy alta  
Fecha: 2026-05-20  
Origen: analisis del estado actual del proyecto y gaps detectados en operacion real

## Proposito

Definir un paquete de mejoras listo para ejecutarse que cierre los huecos mas importantes del sistema actual en:

- permisos por proyecto;
- visibilidad limitada a lo que corresponde a cada usuario;
- trazabilidad completa de cambios;
- consistencia de metricas y notificaciones;
- endurecimiento de reglas de datos en Supabase.

Este spec no busca agregar complejidad organizacional innecesaria. Busca evitar errores operativos reales como:

- mover tareas de proyectos ajenos;
- asignar trabajo a personas fuera del proyecto;
- leer comentarios o actividad de cualquier proyecto sin necesidad;
- tomar decisiones con KPIs inconsistentes;
- perder contexto historico por cambios no auditados.

## Problema

El sistema actual ya funciona para colaboracion interna basica, pero conserva un modo de acceso demasiado abierto para una operacion mas seria.

Los huecos mas importantes hoy son:

- el acceso efectivo sigue siendo casi global para cualquier usuario autenticado;
- el Kanban carga proyectos, tareas y perfiles completos y filtra mucho del lado cliente;
- la asignacion de responsables no esta restringida a miembros del proyecto;
- el drag and drop cambia `status` sin garantizar auditoria completa;
- comentarios y actividad tienen politicas RLS demasiado abiertas;
- KPIs y eventos usan nombres no consistentes;
- notificaciones y navegacion no siempre llevan al contexto correcto.

## Objetivo

Lograr que el producto responda correctamente a esta regla base:

> un usuario solo puede operar dentro de los proyectos donde participa, salvo permisos explicitamente mas altos.

Y a partir de eso asegurar:

- seguridad suficiente para uso interno serio;
- menor riesgo de errores humanos;
- trazabilidad confiable;
- indicadores operativos coherentes;
- mejor base para siguientes mejoras.

## Resultado esperado

Al terminar este modulo:

- un usuario solo ve proyectos y tareas donde tiene acceso;
- solo puede mover tareas de proyectos donde es miembro;
- solo puede asignar una tarea a miembros del proyecto;
- toda mutacion relevante queda auditada;
- comentarios y actividad respetan membresia;
- notificaciones y accesos rapidos abren el contexto correcto;
- KPIs usan definiciones consistentes y verificables.

## Alcance incluido

- control de acceso por membresia de proyecto;
- distincion entre permisos globales y permisos por proyecto;
- restriccion de lectura y escritura en `projects`, `project_members`, `tasks`, `task_comments`, `task_activity`;
- restriccion de responsables elegibles por proyecto;
- validaciones frontend y enforcement backend;
- registro de actividad para cambios manuales y drag and drop;
- normalizacion de nombres de eventos;
- correccion de KPIs y notificaciones dependientes de esos eventos;
- deep linking desde alertas y vistas a proyecto/tarea correcta;
- plan de rollout y testing.

## Alcance excluido

- jerarquia organizacional compleja de muchos niveles;
- permisos por campo;
- aprobaciones formales de flujo;
- SSO o integracion con directorios corporativos;
- permisos temporales delegados;
- notificaciones por email o push en esta fase.

## Actores

### 1. Miembro de proyecto

Usuario autenticado que participa en uno o varios proyectos y necesita:

- ver sus proyectos;
- ver y mover tareas permitidas;
- comentar;
- seguir actividad del trabajo donde participa.

### 2. Owner o lider de proyecto

Usuario con control adicional dentro de un proyecto especifico:

- gestionar miembros;
- reasignar trabajo;
- editar configuracion del proyecto;
- ver el estado operativo completo del proyecto.

### 3. Administrador global

Usuario con acceso amplio para mantenimiento y soporte:

- crear o archivar proyectos;
- corregir membresias;
- ver visibilidad transversal;
- operar configuraciones globales.

## Decision de modelo de permisos

Se define un esquema simple de dos capas:

### Capa 1. Rol global

Campo sugerido en `profiles`:

- `global_role`

Valores sugeridos:

- `admin`
- `member`

Reglas:

- `admin` puede ver y operar todos los proyectos;
- `member` solo puede ver y operar proyectos donde tiene membresia;
- el sistema no debe inferir permisos solo por estar autenticado.

### Capa 2. Rol dentro del proyecto

Campos sugeridos en `project_members`:

- `role`
- `added_at`
- `added_by`

Valores sugeridos para `role`:

- `owner`
- `collaborator`

Reglas:

- `owner` puede editar proyecto, gestionar miembros y reasignar tareas dentro del proyecto;
- `collaborator` puede operar tareas y comentar dentro del proyecto;
- un proyecto debe tener al menos un `owner`;
- un `admin` puede actuar como override global.

## Estado actual que motiva este spec

Hallazgos concretos en el codigo actual:

- `authProvider.getPermissions` regresa `null`, por lo que no existe un modelo de permisos utilizable desde la app.
- Kanban consulta `tasks`, `profiles` y `projects` de forma amplia y no por membresia.
- el selector de responsables usa todos los perfiles del sistema en vez de miembros del proyecto;
- el drag and drop cambia estado, pero su auditoria no esta garantizada como flujo unico;
- `task_comments` y `task_activity` permiten lectura e insercion a cualquier autenticado;
- KPIs consultan `status_changed` mientras el frontend registra `status_cambiado`;
- el listado de proyectos navega a `/kanban` generico y no al proyecto concreto;
- las notificaciones abren el tablero generico y no la tarea o proyecto correspondiente.

## Cambios de datos requeridos

## 1. `profiles`

Agregar:

- `global_role TEXT NOT NULL DEFAULT 'member' CHECK (global_role IN ('admin', 'member'))`

Reglas:

- solo `admin` puede cambiar el `global_role` de otro usuario;
- cada usuario puede leer su propio perfil;
- lectura de perfiles de terceros debe limitarse a contexto de proyecto o a admin.

## 2. `project_members`

Agregar:

- `role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator'))`
- `added_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `added_by UUID NULL REFERENCES profiles(id)`

Reglas:

- `unique(project_id, user_id)` obligatorio;
- cada proyecto debe conservar al menos un `owner`;
- no se puede eliminar el ultimo `owner` sin transferir ownership antes.

## 3. `tasks`

No requiere nuevas columnas obligatorias para permisos, pero se agregan reglas:

- `assigned_to` debe ser miembro del mismo `project_id`, salvo `admin`;
- `project_id` no puede cambiarse libremente si el usuario no tiene acceso al proyecto origen y destino;
- mover una tarea entre proyectos debe considerarse evento auditable distinto.

## 4. `task_activity`

Ajustes sugeridos:

- estandarizar `event_type` con valores cerrados;
- agregar `metadata JSONB NULL` para contexto adicional cuando haga falta.

Eventos minimos:

- `task_created`
- `task_status_changed`
- `task_assignee_changed`
- `task_priority_changed`
- `task_due_date_changed`
- `task_project_changed`
- `task_comment_added`

Reglas:

- el evento debe registrarse desde backend o via flujo centralizado confiable;
- no depender del frontend como unica fuente de verdad para auditoria critica.

## Politicas RLS requeridas

## Principio general

Toda tabla operativa debe responder a esta pregunta:

> el usuario autenticado participa en el proyecto asociado al registro o es admin global?

## 1. `projects`

### SELECT

Permitido si:

- el usuario es `admin`; o
- existe una fila en `project_members` con `project_id = projects.id` y `user_id = auth.uid()`.

### INSERT

Permitido si:

- el usuario autenticado crea el proyecto; y
- el flujo tambien crea su membresia inicial como `owner`.

### UPDATE

Permitido si:

- es `admin`; o
- es `owner` del proyecto.

### DELETE

Permitido si:

- es `admin`; o
- politica explicita de negocio lo permite al `owner`.

Recomendacion:

- en primera fase, restringir delete solo a `admin`.

## 2. `project_members`

### SELECT

Permitido si:

- es `admin`; o
- pertenece al mismo proyecto.

### INSERT / UPDATE / DELETE

Permitido si:

- es `admin`; o
- es `owner` del proyecto.

Reglas adicionales:

- no permitir remover al ultimo `owner`;
- no permitir autoescalarse a `owner` sin ser `admin` o `owner` actual.

## 3. `tasks`

### SELECT

Permitido si:

- es `admin`; o
- pertenece al proyecto de la tarea.

### INSERT

Permitido si:

- es `admin`; o
- pertenece al proyecto;
- `assigned_to`, si existe, tambien pertenece al proyecto.

### UPDATE

Permitido si:

- es `admin`; o
- pertenece al proyecto.

Reglas adicionales:

- si cambia `project_id`, debe tener acceso al proyecto destino;
- si cambia `assigned_to`, el nuevo responsable debe pertenecer al proyecto destino;
- si se decide una politica mas estricta, solo `owner` puede reasignar o mover entre proyectos.

## 4. `task_comments`

### SELECT / INSERT

Permitido si:

- es `admin`; o
- pertenece al proyecto al que pertenece la tarea comentada.

Reglas:

- `author_id` debe coincidir con `auth.uid()` salvo automatizacion backend;
- no se permite comentar en tareas fuera de los proyectos propios.

## 5. `task_activity`

### SELECT

Permitido si:

- es `admin`; o
- pertenece al proyecto de la tarea.

### INSERT

Permitido si:

- solo via backend confiable o via politica estricta que valide membresia y actor.

Recomendacion:

- centralizar la escritura de actividad en una funcion SQL o RPC.

## Reglas de negocio ejecutables

## 1. Regla de visibilidad

Un usuario `member` solo debe ver:

- proyectos donde es miembro;
- tareas de esos proyectos;
- comentarios y actividad de esos proyectos;
- perfiles necesarios para esos proyectos.

Un usuario `admin` puede ver todo.

## 2. Regla de movimiento de tareas

Un usuario solo puede mover una tarea si:

- tiene acceso al proyecto de esa tarea; y
- el cambio de `status` ocurre dentro del mismo proyecto.

Si el usuario no tiene acceso:

- el drag debe bloquearse en UI cuando sea posible; y
- la base de datos debe rechazar la operacion de todas formas.

## 3. Regla de asignacion

Una tarea solo puede asignarse a:

- un miembro del proyecto; o
- quedar sin responsable.

No se permite:

- asignar a un usuario ajeno al proyecto;
- mantener `assigned_to` invalido si se remueve un miembro del proyecto sin resolver sus tareas.

Decision operativa sugerida:

- al remover un miembro, el sistema debe detectar tareas activas asignadas a esa persona y obligar a reasignar o dejar sin responsable antes de confirmar.

## 4. Regla de cambio de proyecto

Mover una tarea de proyecto:

- no es equivalente a moverla de columna;
- debe registrarse como evento propio;
- debe validar acceso al proyecto destino;
- debe recalcular responsables elegibles.

## 5. Regla de auditoria

Toda mutacion relevante debe dejar rastro:

- crear tarea;
- cambiar `status`;
- cambiar responsable;
- cambiar prioridad;
- cambiar fecha limite;
- cambiar proyecto;
- agregar comentario.

## 6. Regla de consistencia de eventos

Se define un catalogo unico de `event_type`.

No se aceptan variantes mezcladas como:

- `status_changed`
- `status_cambiado`

Este spec adopta valores canonicos en ingles tecnico para la capa de datos:

- `task_created`
- `task_status_changed`
- `task_assignee_changed`
- `task_priority_changed`
- `task_due_date_changed`
- `task_project_changed`
- `task_comment_added`

La UI puede mostrar etiquetas en espanol, pero la persistencia debe ser canonica.

## Cambios esperados en frontend

## 1. Auth y permisos

- `getPermissions` debe devolver al menos `global_role`, `project_ids` y, si aplica, `project_roles`.
- la app no debe asumir acceso global por defecto.

## 2. Listado de proyectos

- un `member` solo ve proyectos accesibles;
- el boton `Ver tablero` debe abrir el contexto del proyecto seleccionado;
- si el usuario no tiene acceso, no debe existir acceso navegable.

## 3. Kanban

- la lista de proyectos debe venir ya filtrada por acceso;
- la lista de tareas debe venir filtrada por acceso;
- el selector de responsables debe poblarse con miembros del proyecto actual;
- si cambia el proyecto de una tarea, el selector de responsables debe recalcular opciones;
- el drag and drop debe registrar actividad de `task_status_changed`;
- si la operacion es rechazada por permisos, el mensaje debe explicar que no pertenece a ese proyecto.

## 4. Detalle de tarea

- comentarios solo visibles para miembros del proyecto;
- actividad solo visible para miembros del proyecto;
- si el usuario no puede editar ciertos campos, deben mostrarse deshabilitados o no renderizarse.

## 5. Notificaciones

- cada alerta debe llevar al proyecto y tarea correctos;
- el enlace debe poder abrir el drawer de la tarea desde la notificacion;
- no debe navegar a un Kanban generico si existe contexto exacto.

## 6. KPIs y operacion

- las consultas deben basarse en datos a los que el usuario realmente tiene acceso;
- el conteo de completadas debe usar el mismo contrato que la actividad o `completed_at`;
- si un KPI depende de historico, debe usar eventos canonicos y no nombres divergentes.

## Cambios esperados en backend y SQL

## 1. Migraciones

Crear nuevas migraciones para:

1. agregar `global_role` a `profiles`;
2. agregar `role`, `added_at`, `added_by` a `project_members`;
3. agregar restriccion `unique(project_id, user_id)` si no existe;
4. actualizar o recrear politicas RLS en tablas afectadas;
5. crear helpers SQL para validar membresia;
6. crear funcion o trigger para registrar actividad canonicamente.

## 2. Helpers SQL sugeridos

Funciones sugeridas:

- `is_admin(user_id uuid) returns boolean`
- `is_project_member(project_id uuid, user_id uuid) returns boolean`
- `is_project_owner(project_id uuid, user_id uuid) returns boolean`
- `can_assign_user_to_project(project_id uuid, assignee_id uuid) returns boolean`

Beneficio:

- evita duplicar logica compleja en cada policy;
- mejora mantenibilidad;
- reduce errores entre tablas.

## 3. Auditoria centralizada

Opciones validas:

### Opcion A

RPCs para mutaciones sensibles:

- mover tarea;
- reasignar tarea;
- cambiar proyecto;
- comentar.

### Opcion B

Triggers SQL que detecten cambios en `tasks` y creen actividad.

Recomendacion:

- usar triggers para cambios estructurales de `tasks`;
- usar insercion explicita controlada para `task_comment_added`.

## Plan de implementacion

## Fase 1. Modelo y seguridad base

Objetivo:

- dejar la base de datos como fuente real de permisos.

Tareas:

1. agregar campos de rol;
2. agregar constraints en `project_members`;
3. crear funciones helper;
4. reemplazar RLS abierta por RLS basada en membresia y admin;
5. validar acceso con dos usuarios de prueba.

Done:

- un usuario fuera de un proyecto no puede leer ni mutar sus tareas.

## Fase 2. Frontend alineado a permisos

Objetivo:

- evitar UI que ofrezca acciones imposibles o incorrectas.

Tareas:

1. enriquecer `getPermissions`;
2. filtrar fuentes de `projects`, `tasks` y `profiles`;
3. limitar responsables a miembros del proyecto;
4. bloquear acciones no permitidas con mensajes claros;
5. corregir enlaces de proyecto y notificaciones.

Done:

- el usuario solo ve opciones operables.

## Fase 3. Auditoria y consistencia de eventos

Objetivo:

- que el historial y los KPIs sean confiables.

Tareas:

1. definir catalogo final de eventos;
2. migrar referencias frontend al catalogo canonico;
3. registrar actividad de drag and drop;
4. registrar comentarios como evento adicional si aplica;
5. corregir KPIs para usar contrato unico;
6. validar cifras entre timeline y dashboard.

Done:

- cambios operativos y KPIs cuentan la misma historia.

## Fase 4. Endurecimiento operativo

Objetivo:

- cerrar casos borde que suelen romper el modelo en produccion.

Tareas:

1. flujo para remover miembro con tareas abiertas;
2. validacion de cambio de proyecto con recalculo de responsables;
3. proteccion del ultimo `owner`;
4. pruebas manuales y smoke tests de permisos.

Done:

- los flujos conflictivos quedan resueltos antes de abrir mas usuarios.

## Criterios de aceptacion

## Permisos

- un usuario `member` no puede ver proyectos donde no participa;
- un usuario `member` no puede mover tareas de proyectos ajenos;
- un usuario `member` no puede comentar en tareas de proyectos ajenos;
- un usuario `admin` puede ver y operar transversalmente;
- solo `owner` o `admin` puede gestionar miembros del proyecto.

## Asignacion

- una tarea no puede asignarse a alguien fuera del proyecto;
- al editar una tarea, el selector solo muestra miembros elegibles;
- si se remueve un miembro con tareas activas, el sistema obliga a resolverlas.

## Auditoria

- mover una tarea de columna genera `task_status_changed`;
- cambiar responsable genera `task_assignee_changed`;
- agregar comentario genera evento trazable si asi se define en implementacion;
- el timeline refleja cambios realizados por UI y por triggers de forma consistente.

## KPIs y notificaciones

- los KPIs no mezclan nombres de evento incompatibles;
- el conteo de completadas puede verificarse contra `completed_at` o actividad canonica;
- una notificacion abre la tarea o proyecto correcto;
- el usuario no puede recibir una notificacion que lo lleve a un recurso sin acceso.

## Riesgos

- endurecer RLS sin adaptar el frontend puede romper pantallas existentes;
- la migracion de eventos puede dejar historico mixto si no se planea compatibilidad;
- si `profiles` sigue siendo visible globalmente, parte del beneficio de privacidad se pierde;
- proteger correctamente `project_members` exige resolver el caso del ultimo `owner`.

## Mitigaciones

- hacer rollout por fases;
- probar con usuarios reales de distintos proyectos;
- agregar logs temporales para rechazos de policy;
- mantener una migracion de compatibilidad para historico de `event_type` si hace falta.

## Estrategia de testing

## Smoke tests minimos

1. usuario A miembro de proyecto X ve proyecto X;
2. usuario A no miembro de proyecto Y no ve proyecto Y;
3. usuario A no puede mover tarea de proyecto Y por API ni por UI;
4. usuario owner puede agregar y quitar miembros;
5. usuario collaborator no puede cambiar miembros;
6. tarea solo admite responsables del proyecto;
7. mover tarea actualiza timeline y KPI relacionado.

## Tests de integracion utiles

- helper `is_project_member`;
- helper `is_project_owner`;
- validacion de asignacion de responsables;
- trigger o RPC de actividad;
- normalizacion de `event_type`.

## Tests manuales de alto valor

- dos sesiones simultaneas con proyectos distintos;
- remover miembro con tareas activas;
- mover tarea entre proyectos;
- navegar desde notificacion a tarea concreta;
- revisar dashboard con usuario `member` y con `admin`.

## Decisiones abiertas

1. `owner` puede borrar proyectos o solo `admin`?
2. un `collaborator` puede reasignar tareas o solo mover su status?
3. conviene permitir cambio manual de `project_id` en la UI o dejarlo fuera de esta fase?
4. `profiles` debe ser visible por cualquier autenticado o solo por pertenencia cruzada a proyecto?

## Recomendacion de ejecucion

Orden recomendado:

1. migraciones de roles y membresia;
2. helpers SQL;
3. RLS nueva;
4. adaptacion de queries frontend;
5. limitacion de responsables;
6. auditoria canonica;
7. correccion de KPIs y notificaciones;
8. smoke tests.

## Definition of Done

Esta mejora se considera terminada solo si:

- las politicas RLS ya no permiten acceso global por autenticacion simple;
- la UI deja de ofrecer acciones fuera de permiso;
- la asignacion por proyecto queda forzada en backend;
- la actividad registrada coincide con cambios reales;
- KPIs y notificaciones usan el mismo contrato de eventos;
- el comportamiento fue probado con al menos un `admin` y dos `member` en proyectos distintos;
- el spec se mantiene alineado con la implementacion final.
