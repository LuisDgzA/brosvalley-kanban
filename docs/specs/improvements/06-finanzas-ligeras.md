# Spec — Dashboard financiero ligero

Estado: Proposed  
Prioridad fuente: Media  
Origen: `PROJECT_IMPROVEMENTS.md`

## Modulo

Este modulo cubre la mejora:

- dashboard financiero ligero.

## Problema

Direccion puede necesitar una lectura ejecutiva simple de esfuerzo y presupuesto por proyecto, pero el sistema actual esta centrado solo en tareas y operacion.

## Objetivo

Agregar visibilidad financiera minima sin convertir el producto en un ERP.

## Alcance incluido

- presupuesto estimado por proyecto;
- costo acumulado o estimado;
- avance del proyecto;
- lectura ejecutiva simple por proyecto.

## Alcance excluido

- contabilidad;
- facturacion;
- centros de costo complejos;
- margen automatizado detallado;
- integracion bancaria.

## Datos sugeridos

- `budget_estimated`
- `cost_actual` o `cost_estimated`
- `health`
- `client_name`

## Reglas de negocio

- esta mejora aplica solo si el negocio realmente necesita lectura financiera;
- los importes deben tener moneda definida;
- los datos financieros deben ser simples y auditables;
- el avance puede reutilizar el porcentaje de tareas completadas mientras no exista modelo financiero mas sofisticado.

## UI esperada

- seccion ejecutiva en detalle de proyecto;
- cards resumen en dashboard si aplica;
- semaforo de salud del proyecto.

## Criterios de aceptacion

- un proyecto puede guardar presupuesto y costo;
- la vista de proyecto muestra datos financieros basicos;
- la ausencia de datos financieros no rompe la UX.

## Dependencias tecnicas

- nuevas columnas en `projects`;
- decision de formato monetario.

## Riesgos

- puede introducir complejidad de negocio prematura;
- si el costo no se actualiza con disciplina, pierde valor.
