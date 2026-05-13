# Spec — Plantillas y etiquetas

Estado: Proposed  
Prioridad fuente: Media  
Origen: `PROJECT_IMPROVEMENTS.md`

## Modulo

Este modulo cubre:

- plantillas de proyecto;
- etiquetas por area.

## Problema

Crear proyectos desde cero genera trabajo repetitivo y poca consistencia entre equipos. Tambien falta una forma simple de clasificar tareas por area funcional.

## Objetivo

Acelerar la creacion de proyectos y mejorar segmentacion operativa.

## Alcance incluido

- plantillas reutilizables de proyecto;
- tareas base predefinidas;
- etiquetas por area en tareas;
- filtros por area.

## Alcance excluido

- automatizaciones complejas por plantilla;
- dependencias entre tareas en primera fase;
- taxonomias libres ilimitadas sin control.

## 1. Plantillas de proyecto

### Casos iniciales sugeridos

- onboarding;
- ventas;
- implementacion;
- marketing.

### Reglas de negocio

- una plantilla define un conjunto base de tareas;
- crear proyecto desde plantilla no debe modificar la plantilla original;
- la plantilla puede servir como punto de partida editable;
- una organizacion pequena puede empezar con pocas plantillas curadas.

### UI esperada

- opcion de crear proyecto vacio o desde plantilla;
- selector de plantilla;
- previsualizacion simple del contenido base si agrega valor.

### Criterios de aceptacion

- el usuario puede crear proyecto desde una plantilla;
- las tareas base aparecen asociadas al nuevo proyecto;
- editar el proyecto no altera la plantilla fuente.

## 2. Etiquetas por area

### Areas sugeridas

- `Ventas`
- `Producto`
- `Operaciones`
- `Diseno`
- `Admin`

### Reglas de negocio

- una tarea puede tener una o varias etiquetas segun decision final de diseno;
- en primera fase conviene lista cerrada para mantener orden;
- las etiquetas deben ayudar a filtrar y entender contexto, no sustituir prioridad o status.

### UI esperada

- selector de area en tarea;
- badges visibles en tarjetas o tablas;
- filtro rapido por area.

### Criterios de aceptacion

- una tarea puede guardarse con etiqueta de area;
- la etiqueta se muestra en vistas relevantes;
- el usuario puede filtrar tareas por area.

## Dependencias tecnicas

- decidir si etiqueta sera columna simple o relacion aparte;
- definir si las plantillas viven en tablas propias o configuracion semiestructurada.

## Riesgos

- demasiadas plantillas generan mantenimiento innecesario;
- etiquetas libres pueden fragmentar los datos;
- copiar tareas desde plantilla puede requerir estrategia de versionado futura.
