# FilmStack 

FilmStack es una plataforma web social para la gestión de catálogos cinematográficos propios (_watchlist_). Permite organizar películas, resolver la indecisión de qué ver, compartir reseñas con amigos y llevar registro de tu opinión sobre cada película.

---

## Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | Angular 21 · TypeScript 5.7 · Bootstrap 5 · Signals API |
| **Backend** | PocketBase 0.25.3 (Go) — API REST + base de datos SQLite |
| **Gateway** | Nginx (reverse proxy) |
| **Contenedores** | Docker Compose |
| **Fuente de datos** | TMDB API (The Movie Database) |

---

## Arquitectura

El frontend sigue una **Arquitectura Domain-Driven Design (DDD)** con Clean Architecture:

```
src/
├── app/
│   ├── core/                    # Capa de infraestructura global
│   │   ├── guards/              # Guards de ruta (AuthGuard)
│   │   ├── interfaces/          # Interfaces compartidas (Movie, UserSummary)
│   │   └── services/            # Servicios globales (Pocketbase, Auth, Toast, etc.)
│   │
│   ├── features/                # Módulos por dominio
│   │   ├── auth/                # Autenticación
│   │   │   └── components/login/
│   │   ├── backlog/             # Gestión de backlog personal
│   │   │   └── components/
│   │   │       ├── backlog-view/
│   │   │       ├── backlog-card/        # Componente presentacional
│   │   │       ├── edit-movie-modal/
│   │   │       ├── movie-detail-modal/
│   │   │       └── review-share-card/
│   │   ├── search/              # Búsqueda TMDB
│   │   │   └── components/
│   │   │       ├── search-view/
│   │   │       └── add-movie-modal/
│   │   ├── roulette/            # Ruleta de películas
│   │   ├── social/              # Funcionalidad social (amigos, watchparty)
│   │   │   ├── interfaces/      # Interfaces de dominio social
│   │   │   └── components/
│   │   │       ├── social-view/
│   │   │       ├── watchparty/
│   │   │       └── watchparty-history/
│   │   ├── profile/             # Perfil de usuario
│   │   └── admin/               # Panel de administración
│   │
│   └── shared/                  # Componentes reutilizables
```

Principios aplicados:
- **Container/Presentational Pattern**: Separación entre lógica (container) y presentación (componentes hijos)
- **Inyección de Dependencias**: Componentes nunca inyectan `PocketbaseService` directamente; usan servicios de dominio intermedios
- **Signals API**: Estado reactivo sin Zone.js tradicional
- **Validación en UI**: Feedback visual en formularios con clases `is-invalid` y mensajes de error por campo

---

## Funcionalidades

| Función | Descripción |
| :--- | :--- |
|  **Autenticación** | Login con email/contraseña, manejo de sesión con JWT, detección de cuentas suspendidas |
|  **Búsqueda TMDB** | Buscar películas, filtrar por género/año/rating, ver detalles |
|  **Backlog** | Agregar películas con estado (pendiente/vista/abandonada), calificar con estrellas, escribir reseñas |
|  **Ruleta** | Selección aleatoria de película del backlog para decidir qué ver |
|  **Social** | Gestión de amigos, solicitudes, perfil público |
|  **Watchparty** | Sesiones grupales de visualización con chat en tiempo real y reseñas grupales |
|  **Exportar reseña** | Exportar reseña como imagen PNG para compartir |
|  **Admin** | Gestión de usuarios, roles, suspensión de cuentas |

---

## Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- Archivo `.env` en la raíz del proyecto. **IMPORTANTE**: Necesitás una clave de TMDB API.

### Obtener TMDB API Key

1. Creá una cuenta en [TMDB](https://www.themoviedb.org/)
2. Andá a [Settings → API](https://www.themoviedb.org/settings/api)
3. Solicitá una API Key (plan gratuito)
4. Copiá el `.env.example` a `.env` y poné tu key:

```bash
cp .env.example .env
# Editá .env y reemplazá tu_api_key_aqui con tu key real
```

---

## Levantar el proyecto

Desde la raíz del proyecto (donde está `docker-compose.yml`):

```bash
docker compose up --build
```

Esto construirá las imágenes y levantará los 3 servicios:

| Servicio | Descripción | Puerto expuesto |
| :--- | :--- | :--- |
| `frontend` | App Angular compilada y servida con Nginx | — (interno) |
| `backend` | PocketBase (API + base de datos SQLite) | — (interno) |
| `gateway` | Nginx reverse proxy que unifica todo | **8090** |

Una vez arriba, accedé a la aplicación en: **http://localhost:8090**

El panel de administración de PocketBase está disponible en: **http://localhost:8090/_/**

### Prueba rápida

```bash
# Verificar que los contenedores estén corriendo
docker compose ps

# Ver logs del backend
docker compose logs backend

# Ver logs del frontend
docker compose logs frontend
```

---

## Reconstruir el proyecto

Si realizás cambios en el código fuente o las dependencias, reconstruí las imágenes con:

```bash
docker compose up --build
```

Para forzar una reconstrucción completa sin caché:

```bash
docker compose build --no-cache
docker compose up
```

---

## Detener el proyecto

```bash
docker compose down
```

Para detener y eliminar los volúmenes (⚠️ borra la base de datos local):

```bash
docker compose down -v
```

---

## Desarrollo local (sin Docker)

Si preferís correr el frontend en modo desarrollo:

```bash
cd frontend
npm install
npm start
```

El servidor de desarrollo estará disponible en **http://localhost:4200**.

> **Nota:** Necesitás tener el backend (PocketBase) corriendo por separado para que la app funcione correctamente.

---

## Estructura de Base de Datos (PocketBase)

| Colección | Propósito |
| :--- | :--- |
| `users` | Usuarios, amigos, solicitudes, roles |
| `movies` | Backlog de películas por usuario |
| `rankings` | Calificaciones y reseñas de la comunidad |
| `watchparties` | Sesiones grupales de visualización |
| `group_reviews` | Reseñas grupales de watchparty |

Las migraciones se ejecutan automáticamente al iniciar PocketBase vía `--migrationsDir=/pb_migrations`.

---

## Variables de Entorno

| Variable | Obligatorio | Descripción |
| :--- | :---: | :--- |
| `TMDB_API_KEY` | ✅ | API Key de The Movie Database para búsqueda y metadatos |

Ver `.env.example` para la plantilla.

---

## Formularios y Validación

Todos los formularios incluyen validación con feedback visual:

- **Login**: Validación de email (formato) y contraseña (mínimo 6 caracteres) con clases `is-invalid` y mensajes por campo
- **Perfil**: Validación de nombre (mínimo 3 caracteres) y email (formato)
- **Agregar/Editar película**: Validación de calificación (requerida para estado "vista")
- **Notificaciones**: Sistema de toasts global con tipos success/error/info/warning

---

## Manejo de Errores

- Los errores de API se capturan con `try/catch` y se muestran al usuario mediante `ToastService`
- Errores silenciosos controlados para operaciones no críticas (carga de detalles TMDB, estadísticas)
- El `AuthGuard` protege rutas redirigiendo a `/login` si no hay sesión válida
- Al cerrar sesión se limpia el `ActiveSessionService` (sesión de ruleta activa)

---
