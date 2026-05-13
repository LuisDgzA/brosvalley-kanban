# Spec Driven Development (SDD) — BrosValley CRM

Version: 1.0  
Fecha: 2026-05-13  
Estado: Working spec  
Idioma base del producto: Espanol  

## 1. Proposito del documento

Este documento define una especificacion funcional y tecnica suficientemente clara para que BrosValley CRM se desarrolle con enfoque SDD: primero se acuerda el comportamiento esperado, despues se implementa, y finalmente se valida contra criterios explicitos.

La meta no es solo describir ideas, sino convertir lo que ya existe en el proyecto en una fuente de verdad compartida para:

- alinear producto, diseno y desarrollo;
- distinguir funcionalidades ya implementadas vs. pendientes;
- reducir ambiguedad al abrir nuevas tareas;
- facilitar decisiones futuras sobre alcance, seguridad y calidad.

## 2. Que significa SDD en este proyecto

En BrosValley CRM, Spec Driven Development significa que cada cambio relevante debe partir de una especificacion con estos elementos:

- problema a resolver;
- alcance incluido y excluido;
- actores involucrados;
- reglas de negocio;
- comportamiento esperado en UI y datos;
- dependencias tecnicas;
- criterios de aceptacion;
- riesgos y decisiones abiertas.

La implementacion no debe convertirse en la especificacion. El codigo materializa el spec, pero el spec sigue siendo la referencia principal.

## 3. Fuentes usadas para esta version

Esta version del spec fue construida con base en:

- `PLAN.md`
- `PROJECT_IMPROVEMENTS.md`
- `src/App.tsx`
- `src/providers/auth.ts`
- `src/providers/data/index.tsx`
- `src/providers/supabase.ts`
- `src/providers/constants.ts`
- `src/pages/home/index.tsx`
- `src/pages/projects/*`
- `src/pages/kanban/index.tsx`
- `src/pages/login/index.tsx`
- `src/pages/register/index.tsx`
- `src/pages/forgotPassword/index.tsx`
- `src/pages/updatePassword/index.tsx`
- `src/components/layout/*`
- `supabase/migrations/20260505_add_email_to_profiles.sql`

Nota importante: el schema completo de base de datos existe de forma explicita en `PLAN.md`, pero no esta totalmente versionado como migraciones SQL dentro del repo. Por eso este documento marca algunas partes como `definidas en plan` y otras como `validadas en codigo`.

## 4. Resumen ejecutivo

BrosValley CRM es una aplicacion web interna para gestionar proyectos y tareas con enfoque operativo. Su propuesta de valor es responder rapido tres preguntas:

- quien es responsable;
- que esta en riesgo esta semana;
- que bloquea el avance de un proyecto.

El sistema actual ya cubre una parte sustancial de ese objetivo:

- autenticacion con Supabase;
- rutas protegidas;
- dashboard con metricas de proyectos y tareas;
- CRUD de proyectos;
- relacion de miembros por proyecto;
- tablero Kanban con drag and drop;
- creacion y edicion de tareas desde el Kanban.

Los principales huecos detectados hoy no estan en la base del producto, sino en hardening y evolucion:

- politicas RLS demasiado abiertas segun el plan actual;
- realtime no validado en el codigo actual;
- deuda tecnica heredada de GraphQL todavia presente en dependencias y archivos;
- ausencia visible de pruebas automatizadas;
- falta de un spec formal versionado hasta ahora.

## 5. Vision de producto

Construir una herramienta interna simple, rapida y confiable para coordinar trabajo entre equipos pequenos, con foco en operaciones, seguimiento y claridad de responsabilidades.

## 6. Objetivos del producto

- Centralizar proyectos, tareas y responsables.
- Dar visibilidad operativa diaria a direccion y ejecucion.
- Permitir seguimiento por proyecto y por estado de tarea.
- Reducir coordinacion informal dispersa en chat o memoria.
- Preparar una base extensible para comentarios, actividad, prioridad, alertas y KPIs.

## 7. No objetivos actuales

En el alcance actual no se considera obligatorio:

- CRM comercial completo con leads, pipeline de ventas y oportunidades;
- facturacion;
- autorizacion compleja por roles finos;
- soporte multiempresa;
- version movil nativa;
- automatizaciones avanzadas;
- reporteria BI profunda.

## 8. Actores

### 8.1 Usuario autenticado

Persona del equipo interno que entra al sistema para:

- ver proyectos;
- crear o editar proyectos;
- consultar y mover tareas;
- ver sus propias tareas;
- colaborar en seguimiento.

### 8.2 Lider operativo

Usuario que necesita visibilidad transversal y lectura ejecutiva:

- revisar carga actual;
- detectar atrasos;
- reasignar;
- seguir avance por proyecto.

### 8.3 Administrador tecnico

Responsable de:

- configurar Supabase;
- mantener variables de entorno;
- aplicar migraciones;
- ajustar politicas RLS;
- habilitar realtime.

## 9. Estado actual del sistema

### 9.1 Implementado y validado en codigo

- Integracion principal con Supabase para datos y auth.
- `authProvider` personalizado con login, register, logout, check, getIdentity.
- Rutas protegidas con `Authenticated`.
- Pantallas de auth: login, registro, recuperacion y actualizacion de password.
- Recursos Refine registrados: `home`, `projects`, `tasks`, `profiles`, `project_members`.
- Layout autenticado con header y usuario actual.
- Dashboard de inicio con:
  - total de proyectos;
  - conteo por estado de tareas;
  - tabla de mis tareas;
  - lista de proyectos recientes.
- Vista de proyectos:
  - listado;
  - creacion;
  - edicion;
  - detalle.
- Sincronizacion de miembros de proyecto via tabla `project_members`.
- Vista Kanban con:
  - columnas fijas;
  - filtro por proyecto;
  - drag and drop;
  - creacion de tarea por columna;
  - drawer de detalle y edicion de tarea.

### 9.2 Definido en plan pero no validado directamente en codigo

- SQL inicial completo de `profiles`, `projects`, `project_members`, `tasks`.
- Trigger de creacion automatica de perfiles.
- Politicas RLS base en las cuatro tablas.
- Realtime habilitado desde Supabase Dashboard.

### 9.3 Pendiente o incompleto

- Confirmar y activar `liveMode="auto"` donde aplique.
- Endurecer RLS.
- Eliminar deuda tecnica GraphQL residual.
- Versionar el schema completo como migraciones.
- Agregar pruebas automatizadas.
- Traducir mejoras futuras en specs separados.

## 10. Alcance funcional actual

## 10.1 Modulo de autenticacion

### Objetivo

Permitir acceso seguro y manejo de identidad para el equipo interno.

### Funcionalidades

- Inicio de sesion con email y password.
- Registro con nombre, email y password.
- Recuperacion de password por email.
- Actualizacion de password desde flujo de recuperacion.
- Cierre de sesion.
- Obtencion de identidad del usuario desde `auth.users` + `profiles`.

### Reglas de negocio

- El email debe tener formato valido.
- El password de registro requiere minimo 6 caracteres.
- El nombre del registro debe enviarse en metadata para poblar `profiles`.
- Si existe sesion valida, el usuario puede acceder a rutas privadas.
- Si no existe sesion, debe redirigirse a `/login`.

### Comportamiento esperado

- `/login`, `/register`, `/forgot-password`, `/update-password` son accesibles sin layout privado.
- `/`, `/projects`, `/kanban` requieren autenticacion.
- El header muestra usuario actual y accion de logout.

## 10.2 Dashboard de inicio

### Objetivo

Dar una lectura ejecutiva rapida del estado operativo.

### Funcionalidades

- Conteo de proyectos activos.
- Conteo de tareas por estado:
  - `TODO`
  - `IN_PROGRESS`
  - `IN_REVIEW`
  - `DONE`
- Tabla de tareas asignadas al usuario autenticado.
- Lista de proyectos recientes.

### Reglas de negocio

- Las tareas personales filtran por `assigned_to = currentUser.id`.
- Los proyectos recientes se ordenan por `created_at desc`.
- El dashboard debe tolerar estados vacios sin romper UI.

## 10.3 Gestion de proyectos

### Objetivo

Permitir alta, consulta y mantenimiento de proyectos con miembros asociados.

### Funcionalidades

- Listado visual de proyectos.
- Creacion de proyecto.
- Edicion de proyecto.
- Detalle de proyecto.
- Eliminacion de proyecto desde listado.
- Asociacion de miembros via `project_members`.

### Campos del proyecto

- `name` requerido
- `description` opcional
- `due_date` opcional
- `created_by` automatico al crear

### Reglas de negocio

- El nombre es obligatorio.
- Al guardar un proyecto, la seleccion actual de miembros debe sincronizarse con `project_members`.
- Un proyecto puede existir sin fecha limite.
- Un proyecto puede existir sin miembros.

### Comportamiento esperado

- El listado debe mostrar nombre, descripcion, fecha y equipo.
- El detalle debe mostrar resumen, miembros y tareas del proyecto.
- El avance estimado del proyecto se calcula como `% DONE sobre total de tareas`.

## 10.4 Gestion de tareas en Kanban

### Objetivo

Permitir seguimiento visual de tareas por estado.

### Estados soportados

- `TODO`
- `IN_PROGRESS`
- `IN_REVIEW`
- `DONE`

### Funcionalidades

- Visualizar tareas en columnas fijas por status.
- Filtrar tablero por proyecto.
- Crear tarea desde una columna.
- Editar tarea desde drawer.
- Mover tarea entre columnas con drag and drop.

### Campos de tarea

- `title` requerido
- `description` opcional
- `status` requerido
- `project_id` requerido en UI actual
- `assigned_to` opcional
- `due_date` opcional
- `created_by` automatico cuando hay usuario
- `updated_at` actualizado en ediciones y cambios de status

### Reglas de negocio

- Toda tarea visible pertenece a un status valido.
- En la UI actual, crear o editar tarea requiere proyecto seleccionado.
- Una tarea puede quedar sin responsable.
- Mover una tarea entre columnas cambia unicamente `status` y `updated_at`.
- El drawer protege contra perdida accidental de cambios sin guardar.

### Comportamiento esperado

- La tarjeta muestra titulo, proyecto, responsable y fecha limite.
- El contador por columna refleja la cantidad de tareas en ese estado.
- El usuario puede abrir una tarjeta para editarla.

## 11. Modelo de dominio

### 11.1 Entidades principales

#### `profiles`

Representa a cada usuario del sistema en capa de negocio.

Campos esperados:

- `id`
- `name`
- `email`
- `avatar_url`
- `job_title`
- `created_at`

#### `projects`

Unidad principal de seguimiento operativo.

Campos esperados:

- `id`
- `name`
- `description`
- `due_date`
- `created_by`
- `created_at`

#### `project_members`

Tabla de relacion muchos-a-muchos entre proyecto y perfil.

Campos esperados:

- `id`
- `project_id`
- `user_id`

Restriccion esperada:

- `unique(project_id, user_id)`

#### `tasks`

Trabajo operativo rastreable dentro del tablero.

Campos esperados:

- `id`
- `title`
- `description`
- `status`
- `project_id`
- `assigned_to`
- `due_date`
- `created_by`
- `created_at`
- `updated_at`

### 11.2 Relaciones

- Un `profile` puede crear muchos `projects`.
- Un `project` puede tener muchos `tasks`.
- Un `project` puede tener muchos `profiles` a traves de `project_members`.
- Un `task` puede pertenecer a un `project`.
- Un `task` puede estar asignado a un `profile`.

## 12. Reglas de negocio transversales

- Solo usuarios autenticados acceden al producto.
- El perfil de usuario debe existir o poder inferirse tras registro.
- Los estados de tarea son cerrados y no libres.
- La fecha limite puede ser nula en proyectos y tareas.
- Las vistas deben mostrar vacios elegantes cuando no existan datos.
- El sistema actual asume colaboracion interna, no exposicion publica.

## 13. Requisitos no funcionales

### 13.1 Seguridad

- Autenticacion via Supabase Auth.
- Variables sensibles deben venir por entorno.
- RLS debe estar habilitado en tablas operativas.

### 13.2 Confiabilidad

- Las mutaciones deben mostrar exito o error al usuario.
- La app no debe depender de joins no versionados sin documentarlos.

### 13.3 Mantenibilidad

- El schema debe migrarse a SQL versionado en el repo.
- Los specs nuevos deben referenciar este documento o extenderlo.

### 13.4 UX

- La navegacion debe ser clara para equipo no tecnico.
- El dashboard debe cargar informacion accionable rapidamente.
- El Kanban debe responder sin friccion en desktop.

### 13.5 Performance

- Las consultas de listado principal deben usar filtros y selects razonables.
- Las vistas con catalogos pequenos pueden cargar sin paginacion.

## 14. Arquitectura tecnica actual

### Frontend

- React 19
- Vite
- TypeScript
- Ant Design
- Refine

### Backend gestionado

- Supabase Auth
- Supabase Postgres
- Supabase Data Provider
- Potencial Supabase Realtime

### Patrones ya usados

- `useList`, `useOne`, `useCreate`, `useUpdate` de Refine.
- `authProvider` custom conectado a Supabase.
- `meta.select` para joins y shape de datos desde Supabase.
- Formularios Ant Design con validacion local.

## 15. Rutas y navegacion

### Publicas

- `/login`
- `/register`
- `/forgot-password`
- `/update-password`

### Privadas

- `/`
- `/projects`
- `/projects/create`
- `/projects/edit/:id`
- `/projects/show/:id`
- `/kanban`

## 16. Estado de la seguridad de datos

## 16.1 Lo definido hoy

Segun `PLAN.md`, todas las tablas tienen RLS habilitado y politicas de acceso total para usuarios autenticados.

## 16.2 Riesgo actual

Ese esquema sirve para arrancar, pero es demasiado amplio si el producto empieza a manejar informacion sensible o equipos con necesidades de privacidad.

## 16.3 Decision recomendada

Mantener este comportamiento solo como fase bootstrap y abrir un spec separado para:

- lectura restringida por pertenencia de proyecto;
- escritura restringida por ownership o membresia;
- perfiles editables solo por su propio usuario;
- reglas de borrado y auditoria.

## 17. Realtime

## 17.1 Objetivo esperado

Ver cambios de tareas y proyectos sin recargar cuando colabora mas de una persona.

## 17.2 Estado actual

- Existe `liveProvider` configurado.
- No se valido uso explicito de `liveMode="auto"` en los hooks leidos.
- No se confirmo desde codigo la replicacion realtime en Supabase.

## 17.3 Decision para el spec

Realtime queda como `soporte tecnico parcialmente preparado`, pero no debe considerarse feature cerrada hasta validar:

- habilitacion en Dashboard de Supabase;
- uso de `liveMode="auto"` en `tasks` y `projects`;
- comportamiento real en dos sesiones simultaneas.

## 18. Deuda tecnica detectada

### 18.1 Restos de GraphQL legacy

Siguen presentes:

- dependencia `@refinedev/nestjs-query`;
- dependencias de GraphQL y codegen;
- `graphql.config.ts`;
- carpeta `src/graphql/*`;
- `src/providers/data/fetch-wrapper.ts`.

### 18.2 Impacto

- confunde la arquitectura real del proyecto;
- amplia superficie de mantenimiento innecesaria;
- puede inducir a specs o tareas sobre una integracion ya no vigente.

### 18.3 Requisito recomendado

Crear una tarea de limpieza tecnica con criterio de aceptacion:

- remover dependencias no usadas;
- borrar configuracion GraphQL obsoleta;
- actualizar README;
- verificar build sin residuos.

## 19. Gaps de calidad

- No se identificaron pruebas automatizadas en el repo inspeccionado.
- No hay evidencia local de testing E2E.
- El schema completo no esta completamente migrado en SQL versionado.
- No hay documento formal de decisiones de producto aparte del plan inicial.

## 20. Backlog funcional derivado del estado actual

### Prioridad inmediata

- versionar schema inicial completo en `supabase/migrations`;
- validar realtime end-to-end;
- endurecer RLS;
- limpiar legado GraphQL;
- agregar pruebas minimas de humo para auth, proyectos y Kanban.

### Prioridad siguiente

- prioridad de tareas;
- filtros operativos rapidos;
- vista por responsable;
- comentarios y actividad;
- resumen semanal por proyecto.

### Prioridad posterior

- plantillas de proyecto;
- etiquetas por area;
- KPIs de equipo;
- notificaciones clave;
- dashboard financiero ligero si aplica.

## 21. Criterios de aceptacion por modulo

## 21.1 Auth

- Un usuario puede registrarse con nombre, email y password.
- Al registrarse, su identidad queda disponible desde `getIdentity`.
- Un usuario no autenticado no puede entrar a rutas privadas.
- Un usuario autenticado puede cerrar sesion y volver a `/login`.

## 21.2 Dashboard

- El home muestra al menos un conteo general de proyectos.
- El home muestra conteo por cada estado de tarea.
- El home muestra tareas asignadas al usuario actual.
- El home no rompe cuando no hay datos.

## 21.3 Proyectos

- Se puede crear proyecto con nombre obligatorio.
- Se pueden asignar varios miembros.
- Al editar, los miembros quedan sincronizados con la seleccion final.
- El detalle de proyecto muestra miembros y tareas relacionadas.

## 21.4 Kanban

- Las tareas se muestran agrupadas por status.
- El usuario puede crear tarea desde una columna.
- El usuario puede mover tarea entre columnas.
- El usuario puede editar tarea desde drawer.
- La tarea conserva datos editados tras guardar.

## 22. Casos borde a cubrir

- Usuario sin perfil cargado completamente.
- Proyecto sin miembros.
- Proyecto sin tareas.
- Tarea sin `assigned_to`.
- Tarea sin `due_date`.
- Registro con email ya existente.
- Recuperacion de password con email inexistente.
- Cierre del drawer con cambios sin guardar.
- Filtro de Kanban sin proyecto seleccionado.

## 23. Estrategia de testing recomendada

### Smoke tests minimos

- login exitoso;
- redireccion a login si no hay sesion;
- crear proyecto;
- editar miembros de proyecto;
- crear tarea desde Kanban;
- mover tarea de `TODO` a `IN_PROGRESS`;
- editar tarea y persistir cambios.

### Tests de integracion utiles

- `authProvider.getIdentity`;
- `syncProjectMembers`;
- normalizacion de payloads de proyecto;
- validaciones de forms criticos.

### Tests manuales operativos

- flujo de recuperacion de password;
- dos usuarios simultaneos con realtime;
- borrado de proyecto y efecto cascada esperado;
- errores de variables de entorno faltantes.

## 24. Definicion de Done para nuevas features

Una funcionalidad se considera terminada solo si:

- existe spec o addendum aprobado;
- el comportamiento principal esta implementado;
- se cubrieron casos borde relevantes;
- el estado del dato y las reglas de negocio quedaron claros;
- los mensajes de error y exito son entendibles;
- el README o documentacion tecnica se actualizo si aplica;
- no deja deuda silenciosa sin registrar.

## 25. Proceso SDD recomendado para este repo

Para cada nueva iniciativa relevante:

1. Crear una seccion nueva en este documento o un spec hijo.
2. Definir problema, alcance, reglas y criterios de aceptacion.
3. Identificar impacto en schema, UI, permisos y analitica.
4. Implementar contra ese contrato.
5. Validar manual o automaticamente.
6. Actualizar el spec con el estado final real.

## 26. Decisiones abiertas

- El acceso a proyectos y tareas debe ser global para todo autenticado o restringido por membresia?
- `project_id` en tareas debe seguir siendo obligatorio o permitir backlog sin proyecto?
- Se necesita `priority` como campo base ya en la siguiente iteracion?
- Hace falta auditoria de cambios antes de abrir uso intensivo por mas personas?
- Se quiere que `/kanban` recuerde el ultimo proyecto filtrado?

## 27. Roadmap sugerido desde este spec

### Fase A — Hardening de base

- Migraciones SQL completas
- limpieza GraphQL
- README actualizado
- pruebas minimas

### Fase B — Colaboracion real

- realtime validado
- RLS mejorado
- activity log basico

### Fase C — Operacion visible

- prioridades
- filtros rapidos
- vista por responsable
- resumen semanal

## 28. Fuente de verdad temporal

Hasta que exista una carpeta formal de specs, este archivo debe considerarse la referencia principal del producto junto con:

- `PLAN.md` para origen del alcance;
- migraciones SQL para verdad de datos;
- codigo de `src/` para estado real implementado.

Si hay contradiccion entre este documento y el codigo, debe resolverse actualizando uno de los dos inmediatamente. No conviene dejar divergencia silenciosa.

## 29. Conclusion

BrosValley CRM ya supero la etapa de idea inicial y tiene una base funcional real. Lo que mas necesita ahora no es inventar mas alcance de golpe, sino consolidar una fuente de verdad, endurecer la capa de datos y convertir las siguientes mejoras en specs pequenos y ejecutables.

Este documento busca ser exactamente eso: una base SDD completa, util y alineada con lo que hoy ya esta claro en el proyecto.
