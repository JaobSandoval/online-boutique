# Propuesta Comercial: Adopción de Metodología DevOps para Online Boutique

**Preparado para:** Equipo de producto / stakeholders de Online Boutique
**Preparado por:** [Tu nombre / equipo]
**Fecha:** Agosto 2026
**Repositorio de referencia:** https://github.com/JaobSandoval/online-boutique (fork de [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo))

---

## 1. Resumen ejecutivo

Online Boutique es una aplicación de comercio electrónico compuesta por **11 microservicios independientes**, escritos en **6 lenguajes distintos** (Go, Java, Node.js, Python, C#/.NET), que se comunican vía gRPC y se despliegan sobre Kubernetes. Esta arquitectura es potente pero **operacionalmente compleja**: cada servicio tiene su propio ciclo de build, sus propias dependencias y su propio riesgo de fallo.

Sin una metodología DevOps formal, esa complejidad se traduce directamente en **releases lentos, mayor riesgo de incidentes en producción y fricción entre los equipos de desarrollo y operaciones**. Esta propuesta explica por qué adoptar DevOps no es un "nice-to-have" sino un requisito para que Online Boutique escale de forma sostenible, y detalla el plan concreto para implementarlo sobre el repositorio ya forkeado.

---

## 2. Diagnóstico: la arquitectura actual exige DevOps

| Característica de Online Boutique | Riesgo si se gestiona de forma tradicional (manual) |
|---|---|
| 11 microservicios políglotas (Go, Java, Node.js, Python, C#) | Cada uno necesita su propio pipeline de build/test; hacerlo a mano no escala y es inconsistente entre lenguajes. |
| Comunicación síncrona vía gRPC entre servicios | Un despliegue manual mal coordinado entre servicios rompe contratos de API en cascada (ej. `checkoutservice` depende de `paymentservice`, `shippingservice`, `emailservice`, `currencyservice` y `cartservice` simultáneamente). |
| Despliegue nativo en Kubernetes (11 Deployments + Services) | Aplicar manifiestos a mano es propenso a errores de configuración (env vars, puertos, réplicas) y no es auditable. |
| Estado externo (Redis para el carrito) | Requiere gestión de dependencias con estado, backups y health checks automatizados. |
| Múltiples entornos potenciales (dev/staging/prod) | Sin IaC, la configuración diverge entre entornos ("funciona en mi máquina"). |
| Alta frecuencia esperada de cambios (features de e-commerce, temporadas de venta) | Sin CI/CD, cada release es un evento manual, lento y riesgoso — justo cuando el negocio necesita velocidad (ej. Black Friday). |

**Conclusión del diagnóstico:** la arquitectura de microservicios de Online Boutique fue diseñada asumiendo automatización (CI/CD, IaC, orquestación). Operarla sin DevOps anula buena parte de sus ventajas y multiplica su complejidad operativa.

---

## 3. Por qué DevOps, específicamente para esta aplicación

### 3.1 Velocidad de entrega sin sacrificar estabilidad
Con 11 servicios independientes, DevOps permite que cada equipo despliegue su servicio **de forma autónoma y frecuente**, en lugar de coordinar un "big bang release" mensual. Esto se traduce en time-to-market menor para nuevas features (ej. nuevos métodos de pago, promociones).

### 3.2 Reducción de errores humanos en despliegues
Los 11 manifiestos de Kubernetes, el Helm chart y la configuración de Terraform ya existentes en el repositorio están pensados para aplicarse de forma **automatizada y repetible**. Aplicarlos a mano en cada release introduce el mismo riesgo que DevOps existe para eliminar.

### 3.3 Detección temprana de fallos (shift-left)
Con pipelines de CI corriendo tests unitarios/integración por servicio en cada Pull Request, un bug en `productcatalogservice` se detecta en minutos, no cuando ya rompió `frontend` y `recommendationservice` en producción.

### 3.4 Escalabilidad y control de costos
DevOps + Kubernetes permiten autoscaling por servicio según demanda real (ej. `frontend` y `checkoutservice` escalan en campañas, `adservice` no). Sin esto, se sobre-aprovisiona todo el clúster de forma pareja, elevando costos innecesariamente.

### 3.5 Seguridad continua
Escaneo automático de imágenes Docker y dependencias (SAST/SCA) en el pipeline evita que vulnerabilidades conocidas en las 11 imágenes lleguen a producción — algo inviable de sostener manualmente con 6 lenguajes distintos.

### 3.6 Trazabilidad y cumplimiento
Todo cambio pasa por Pull Request, revisión de código y pipeline automatizado, dejando un historial auditable de **qué cambió, quién lo aprobó y cuándo se desplegó** — clave para e-commerce que maneja datos de pago.

---

## 4. Propuesta de implementación

### 4.1 Control de versiones y estrategia de ramas
- Repositorio: fork propio en GitHub (`JaobSandoval/online-boutique`), con `main` protegida (requiere Pull Request + 1 aprobación, sin force-push).
- **Estrategia: GitHub Flow** — `main` siempre desplegable; cambios en ramas de corta duración (`feature/*`, `fix/*`, `docs/*`) que se integran vía PR. Elegida sobre GitFlow por su simplicidad y porque encaja con despliegues continuos frecuentes (no con ciclos de release trimestrales).

### 4.2 Integración continua (CI)
- Pipeline por servicio (aprovechando `.github/workflows/` ya presente en el proyecto original): build, lint, tests unitarios, escaneo de la imagen Docker.
- Ejecutado en cada Pull Request antes de permitir el merge a `main`.

### 4.3 Entrega/despliegue continuo (CD)
- Build y push de imágenes Docker versionadas por commit/tag.
- Despliegue a Kubernetes vía Helm chart (ya incluido) o Kustomize, promovido automáticamente de `dev` → `staging` → `prod` con aprobaciones manuales solo en el paso a producción.

### 4.4 Infraestructura como código (IaC)
- Aprovechar el Terraform incluido (`terraform/`) para aprovisionar el clúster de GKE/K8s y Memorystore (Redis) de forma reproducible entre entornos.

### 4.5 Entorno local de desarrollo
- `docker-compose.yaml` (agregado en este fork, PR [#1](https://github.com/JaobSandoval/online-boutique/pull/1)) para que cualquier desarrollador levante los 11 servicios con un solo comando (`docker compose up`), sin depender de un clúster de Kubernetes para desarrollo diario.

### 4.6 Observabilidad
- Logging centralizado y métricas por servicio (ej. Prometheus/Grafana u OpenTelemetry, ya soportado nativamente por la app) para detectar y resolver incidentes rápido (MTTR bajo).

### 4.7 Gestión del trabajo (Kanban)
- Backlog gestionado en **GitHub Projects**, vinculado directamente al repositorio, con columnas: `Backlog`, `To Do`, `In Progress`, `In Review`, `Done`.

---

## 5. Métricas de éxito (DORA metrics)

| Métrica | Sin DevOps (estimado) | Meta con DevOps |
|---|---|---|
| Frecuencia de despliegue | Semanas/meses | Varias veces por semana o por día |
| Lead time for changes | Días/semanas | Horas |
| Tasa de fallos en cambios | Alta (sin tests automatizados) | Baja (< 15%, con CI obligatorio) |
| Tiempo medio de recuperación (MTTR) | Horas | Minutos |

---

## 6. Próximos pasos

1. Formalizar el equipo (roles: dev por servicio, DevOps/Platform, QA) e invitarlos como colaboradores del repositorio.
2. Poblar el backlog en GitHub Projects a partir de este documento (épicas: CI/CD, IaC, Observabilidad, Seguridad, Entorno local).
3. Habilitar los workflows de CI ya presentes en `.github/workflows/` sobre el fork.
4. Primer despliegue automatizado a un entorno de `staging`.

---

*Este documento acompaña el fork del proyecto open source "Online Boutique" de Google Cloud Platform, usado como caso de estudio para la adopción de DevOps.*
