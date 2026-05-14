# Spec — Notificaciones y KPIs

Estado: Implemented  
Prioridad fuente: Media  
Origen: `PROJECT_IMPROVEMENTS.md`

## Modulo

Este modulo cubre:

- notificaciones clave;
- KPIs de equipo.

## Problema

Aunque el sistema centraliza trabajo, sigue faltando una capa de aviso y medicion para reaccionar a tiempo y evaluar ritmo operativo.

## Objetivo

Permitir seguimiento proactivo y medicion basica del desempeno operativo.

## Alcance incluido

- alertas en la interfaz grafica para eventos clave;
- metricas de throughput y tiempos;
- proyectos con mayor retraso;
- tableros o widgets de KPIs.

## Alcance excluido

- analitica avanzada estilo BI;
- notificaciones push multiplataforma;
- reglas de automatizacion complejas por usuario.

## 1. Notificaciones clave

### Eventos iniciales

- una tarea vence pronto;
- cambia el responsable;
- la tarea entra a revision.

### Reglas de negocio

- las notificaciones deben ser utiles y no excesivas;
- debe definirse que significa `vence pronto`, recomendado: dentro de 48 horas o 72 horas;
- la notificacion debe incluir contexto minimo: tarea, proyecto, responsable, fecha.

### Criterios de aceptacion

- un evento configurado dispara una notificacion en la interfaz;
- la notificacion contiene contexto suficiente para actuar;
- no se generan duplicados obvios para el mismo evento sin cambio nuevo.

## 2. KPIs de equipo

### Indicadores propuestos

- tareas completadas por semana;
- tiempo promedio por estado;
- proyectos con mayor retraso.

### Reglas de negocio

- `completadas por semana` depende de contar con `completed_at`;
- `tiempo promedio por estado` requiere historial o actividad confiable;
- `mayor retraso` debe basarse en tareas vencidas, fecha limite o ambos.

### UI esperada

- widgets ejecutivos;
- ranking simple o tabla;
- periodo visible de calculo.

### Criterios de aceptacion

- al menos un KPI semanal puede consultarse por periodo definido;
- los KPIs tienen definiciones explicitas y consistentes;
- el usuario puede identificar rapidamente proyectos o areas con mayor retraso.

## Dependencias tecnicas

- `completed_at` en `tasks`;
- actividad o auditoria por cambios de estado;
- mecanismo frontend para mostrar y gestionar notificaciones en la UI.

## Riesgos

- sin definiciones duras los KPIs pierden confianza;
- notificaciones excesivas generan fatiga;
- si los cambios de estado no quedan auditados, algunos KPIs no seran fiables.
