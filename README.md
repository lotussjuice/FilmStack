# FilmStack

FilmStack es una plataforma web social para la gestión de catálogos cinematográficos propios [WatchList]. Permite organizar películas, resolver la indecisión de qué ver y llevar registro de tu opinión.

## Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Frontend | Angular 21 · Bootstrap 5 · Signals API |
| Backend | PocketBase 0.25.3 |
| Gateway | Nginx (reverse proxy) |
| Contenedores | Docker Compose |

## Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- Archivo `.env` en la raíz del proyecto con las variables necesarias (ver `.env.example` o el existente).

## Levantar el proyecto

Desde la raíz del proyecto (donde está `docker-compose.yml`):

```bash
docker compose up --build
```

Esto construirá las imágenes y levantará los 3 servicios:

| Servicio | Descripción | Puerto expuesto |
| :--- | :--- | :--- |
| `frontend` | App Angular compilada y servida con Nginx | — (interno) |
| `backend` | PocketBase (API + base de datos) | — (interno) |
| `gateway` | Nginx reverse proxy que unifica todo | **8090** |

Una vez arriba, accede a la aplicación en: **http://localhost:8090**

El panel de administración de PocketBase está disponible en: **http://localhost:8090/_/**

## Reconstruir el proyecto

Si realizas cambios en el código fuente o las dependencias, reconstruye las imágenes con:

```bash
docker compose up --build
```

Para forzar una reconstrucción completa sin caché:

```bash
docker compose build --no-cache
docker compose up
```

## Detener el proyecto

```bash
docker compose down
```

Para detener y eliminar los volúmenes (⚠️ borra la base de datos local):

```bash
docker compose down -v
```

## Desarrollo local (sin Docker)

Si prefieres correr el frontend en modo desarrollo:

```bash
cd frontend
npm install
npm start
```

El servidor de desarrollo estará disponible en **http://localhost:4200**.

> **Nota:** Necesitas tener el backend (PocketBase) corriendo por separado para que la app funcione correctamente.
