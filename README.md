# FilmStack

FilmStack es una plataforma web social para la gestion de catalogos cinematograficos propios (watchlist). Permite organizar peliculas, resolver la indecision de que ver, compartir resenas con amigos y llevar registro de tu opinion sobre cada pelicula.

---

## Stack Tecnologico

| Capa | Tecnologia |
| :--- | :--- |
| **Frontend** | Angular 21 (Standalone) + TypeScript 5.7 + Bootstrap 5 + Signals API |
| **Backend** | PocketBase 0.25.3 (Go) - API REST + base de datos SQLite |
| **Gateway** | Nginx (reverse proxy) |
| **Contenedores** | Docker Compose |
| **Fuente de datos** | TMDB API (The Movie Database) |

---

## Requisitos Previos

- Docker Desktop instalado y corriendo (version 24 o superior).
- Cuenta en TMDB con API Key (paso a paso en seccion Variables de Entorno).
- Puerto 8067 y 8068 disponibles (produccion) o 4200 y 8090 (desarrollo local).

### Inicio rapido

| Entorno | Comando | Acceso |
| :--- | :--- | :--- |
| **Desarrollo local** | `docker compose -f docker-compose-dev.yml up --build` | http://localhost:4200 |
| **Produccion (Pacheco)** | `docker compose up --build -d` | http://pacheco.chillan.ubiobio.cl:8067 |

---

## Gestion de Variables de Entorno

### 1. Obtener TMDB API Key

1. Crear una cuenta en https://www.themoviedb.org/
2. Ir a Settings > API: https://www.themoviedb.org/settings/api
3. Solicitar una API Key (plan gratuito).
4. Copiar el valor generado (un string alfanumerico).

### 2. Configurar archivo .env

El proyecto utiliza un archivo `.env` en la raiz para las variables de entorno sensibles. Este archivo NO se versiona (esta en `.gitignore`).

```bash
# Copiar la plantilla a .env
cp .env.example .env
```

Editar el archivo `.env` resultante. Debe contener:

```
# TMDB API Key - Obligatoria.
# Solicitarla en https://www.themoviedb.org/settings/api
TMDB_API_KEY=tu_api_key_aqui

# PocketBase URL - Usada por el frontend para conectar al backend.
# Desarrollo local: http://localhost:8090
# Produccion (Pacheco): http://pacheco.chillan.ubiobio.cl:8068
POCKETBASE_URL=http://localhost:8090
```

Reemplazar `tu_api_key_aqui` por la API Key real obtenida de TMDB. Sin esta variable, las busquedas de peliculas y la obtencion de metadatos fallaran.

### 3. Variables disponibles

| Variable | Obligatorio | Descripcion |
| :--- | :---: | :--- |
| `TMDB_API_KEY` | SI | API Key de TMDB para busqueda y metadatos de peliculas. Se inyecta al hook de PocketBase y nunca se expone al frontend. |
| `POCKETBASE_URL` | NO | URL base de PocketBase. Usada como referencia para el equipo. Por defecto `http://localhost:8090`. En produccion Pacheco: `http://pacheco.chillan.ubiobio.cl:8068`. |

---

## Entorno de Desarrollo Local

### Arquitectura

```
Localhost:4200 (Angular Dev Server con live-reload)
  |- /api/*  -> proxy.conf.json -> http://backend:8090 (PocketBase)
  |- /_/*    -> proxy.conf.json -> http://backend:8090 (PocketBase Admin)

Localhost:8090 (PocketBase directamente)
```

El frontend se ejecuta en un contenedor con Angular Dev Server que soporta recarga en caliente al modificar archivos. Las peticiones a `/api/` y `/_/` son redirigidas al backend de PocketBase mediante el proxy integrado de Angular CLI (`proxy.conf.json`).

### Comandos para desarrollo local

Los siguientes comandos se ejecutan en la **maquina del desarrollador**.

#### Construir y levantar servicios

```bash
docker compose -f docker-compose-dev.yml up --build
```

Este comando construye las imagenes y levanta los 2 servicios (frontend en puerto 4200, backend en puerto 8090):

| Servicio | Descripcion | Puerto |
| :--- | :--- | :--- |
| `frontend` | Angular Dev Server con live-reload | 4200 |
| `backend` | PocketBase (API + admin + SQLite) | 8090 |

### Acceso

- **Aplicacion:** http://localhost:4200
- **Admin PocketBase:** http://localhost:8090/_/

### Volumenes en desarrollo

El archivo `docker-compose-dev.yml` monta los siguientes volumenes para permitir live-reload:

- `./frontend/src:/app/src` - Cambios en codigo fuente
- `./frontend/public:/app/public` - Archivos publicos
- `./frontend/angular.json`, `tsconfig.json`, `tsconfig.app.json` - Configuracion Angular
- `./frontend/proxy.conf.json` - Configuracion de proxy

Los datos de PocketBase se persisten en `./backend/pb_data/`.

### Detener entorno

```bash
docker compose -f docker-compose-dev.yml down
```

Para detener y eliminar la base de datos local:

```bash
docker compose -f docker-compose-dev.yml down -v
```

---

## Entorno de Produccion (Servidor Pacheco)

### Restricciones de red

El servidor Pacheco expone unicamente los puertos **8067** y **8068** hacia el exterior. No es posible mapear ningun otro puerto.

### Arquitectura

```
Cliente externo
  |
  |- http://pacheco.chillan.ubiobio.cl:8067 --> gateway (nginx) --> frontend (nginx:80) --> Angular SPA
  |- http://pacheco.chillan.ubiobio.cl:8068 --> gateway (nginx) --> backend (PocketBase:8090) --> API + Admin /_/
```

El Gateway Nginx escucha en ambos puertos y redirige segun corresponda. El frontend se sirve desde una imagen Nginx ligera que contiene solo los archivos estaticos compilados de Angular (sin Node.js ni dev server).

### Comandos para produccion

Los siguientes comandos se ejecutan en el **servidor Pacheco** (http://pacheco.chillan.ubiobio.cl).

#### Clonar y configurar (primera vez)

```bash
git clone <repo-url> FilmStack
cd FilmStack
cp .env.example .env
nano .env
# Editar .env: reemplazar tu_api_key_aqui con la TMDB_API_KEY real
```

#### Construir y levantar servicios

```bash
docker compose up --build -d
```

El flag `-d` ejecuta los contenedores en segundo plano (detached). Sin `-d` se ven los logs en tiempo real.

#### Comandos de gestion

```bash
# Ver estado de los contenedores
docker compose ps

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio especifico
docker compose logs -f backend

# Reconstruir sin cache
docker compose build --no-cache
docker compose up -d

# Detener servicios (sin borrar datos)
docker compose down

# Detener y borrar volumen de base de datos
docker compose down -v
```

### Acceso en produccion

- **Aplicacion:** http://pacheco.chillan.ubiobio.cl:8067
- **Admin PocketBase:** http://pacheco.chillan.ubiobio.cl:8068/_/

### Servicios

| Servicio | Descripcion | Puerto interno | Puerto externo |
| :--- | :--- | :--- | :--- |
| `frontend` | Angular compilado servido por Nginx | 80 | - |
| `backend` | PocketBase (API + SQLite) | 8090 | - |
| `gateway` | Nginx reverse proxy | 8067 y 8068 | 8067 y 8068 |

### Volumen persistente

En produccion, los datos de PocketBase se almacenan en un volumen Docker nombrado `pb_data` (definido en `docker-compose.yml`), lo que asegura persistencia incluso si el contenedor se recrea.

```bash
# Verificar que el volumen existe
docker volume ls | grep pb_data

# Backup manual de la base de datos
docker run --rm -v pb_data:/pb_data -v $(pwd):/backup alpine tar czf /backup/pb_data_backup.tar.gz -C /pb_data .
```

---


## Configuracion Inicial de PocketBase

Al iniciar por primera vez, PocketBase ejecuta automaticamente las migraciones ubicadas en `./backend/pb_migrations/`, creando las colecciones necesarias. Sigue estos pasos para completar la configuracion inicial.

### Paso 1: Acceder al panel de administracion

Abrir en el navegador:

- **Desarrollo local:** http://localhost:8090/_/
- **Produccion Pacheco:** http://pacheco.chillan.ubiobio.cl:8068/_/

### Paso 2: Crear superusuario

1. Completar el formulario con:
   - **Email:** (ej. admin@filmstack.com)
   - **Contrasena:** minimo 10 caracteres
   - **Confirmar contrasena**
2. Hacer clic en "Create".
3. IMPORTANTE: Guardar estas credenciales. Son las unicas que permiten acceder al panel de administracion de PocketBase.

### Paso 3: Verificar colecciones

En el panel de administracion, ir a la seccion "Collections". Deberian aparecer automaticamente las siguientes colecciones (creadas por las migraciones):

| Coleccion | Proposito |
| :--- | :--- |
| `users` | Usuarios, amigos, solicitudes, roles |
| `movies` | Backlog de peliculas por usuario |
| `rankings` | Calificaciones y resenas de la comunidad |
| `watchparties` | Sesiones grupales de visualizacion |
| `group_reviews` | Resenas grupales de watchparty |

Si alguna coleccion falta, revisar que el directorio `./backend/pb_migrations/` contenga todos los archivos `.js` y que PocketBase tenga permisos de escritura.

### Paso 4: Verificar reglas de acceso (opcional pero recomendado)

Para cada coleccion, revisar las reglas de seguridad en la pestana "Rules" del panel de administracion. Las migraciones ya configuran las reglas basicas, pero es recomendable verificarlas:

- **users**: `@request.auth.id != ""` para list/update (usuario autenticado).
- **movies**: `@request.auth.id = user_id` para list/update/delete (solo dueno).
- **rankings**: `@request.auth.id != ""` para create, `@request.auth.id = user_id` para update/delete.

### Paso 5: Agregar datos de prueba (opcional)

Para probar la aplicacion inmediatamente:

1. En el panel Admin, ir a "Collections" > "users" > "New record".
2. Crear 2-3 usuarios de prueba con email y contrasena.
3. Ir a "Collections" > "movies" > "New record".
4. Agregar una pelicula de prueba con los campos requeridos (user_id debe ser el ID de uno de los usuarios creados, tmdb_id puede ser 550, 680, etc.).

### Paso 6: Crear usuario de prueba via terminal (alternativa a la UI)

Para crear usuarios directamente sin usar el panel web, ejecutar dentro del contenedor backend:

**Desarrollo local:**
```bash
docker compose -f docker-compose-dev.yml exec backend \
  /usr/local/bin/pocketbase admin create "admin@filmstack.com" "1234567890"
```

**Produccion (Pacheco):**
```bash
docker compose exec backend \
  /usr/local/bin/pocketbase admin create "admin@filmstack.com" "1234567890"
```

Para crear un usuario regular (no admin) en la coleccion `users` via API local dentro del contenedor:

```bash
# Desarrollo local
docker compose -f docker-compose-dev.yml exec backend \
  wget -qO- --post-data='{"email":"test@filmstack.com","password":"1234567890","passwordConfirm":"1234567890","name":"Usuario Test"}' \
  --header='Content-Type: application/json' \
  http://localhost:8090/api/collections/users/records

# Produccion (Pacheco)
docker compose exec backend \
  wget -qO- --post-data='{"email":"test@filmstack.com","password":"1234567890","passwordConfirm":"1234567890","name":"Usuario Test"}' \
  --header='Content-Type: application/json' \
  http://localhost:8090/api/collections/users/records
```

El contenedor backend tiene `wget` instalado (imagen Alpine). Si se prefiere `curl`, instalarlo temporalmente:

```bash
docker compose exec backend apk add curl
```

### Paso 7: Probar la integracion con TMDB

1. Cerrar sesion del admin y volver a la aplicacion (no al panel /_/).
2. Iniciar sesion con un usuario de prueba.
3. Ir a la pestana de busqueda y buscar una pelicula.
4. Si la busqueda funciona, la integracion con TMDB esta operativa.

### Solucion de problemas comunes

| Problema | Causa probable | Solucion |
| :--- | :--- | :--- |
| Error 404 en /api/ | Proxy mal configurado | Verificar `nginx.conf` y `proxy.conf.json` |
| Las busquedas TMDB fallan | TMDB_API_KEY incorrecta | Verificar `.env` y reiniciar backend |
| El panel /_/ no carga | PocketBase no accesible | Verificar `docker compose ps` y logs del backend |
| Las migraciones no se ejecutan | Permisos de directorio | Verificar que `pb_migrations/` tenga permisos de lectura |
| Live-reload no funciona | Volumenes no montados | Verificar `docker-compose-dev.yml` |
| Error CORS en desarrollo | Sin proxy configurado | Verificar que `proxy.conf.json` exista y este montado |

---

## Estructura de Archivos Docker

```
FilmStack/
  .env                      # Variables de entorno (NO versionado)
  .env.example              # Plantilla de variables de entorno
  docker-compose.yml        # Orquestacion de produccion (Pacheco)
  docker-compose-dev.yml    # Orquestacion de desarrollo local
  nginx.conf                # Configuracion del gateway Nginx (produccion)
  frontend/
    Dockerfile.prod         # Build multi-etapa para produccion
    Dockerfile.dev          # Dev server con live-reload
    nginx.conf              # Nginx interno del frontend (sirve static files)
    proxy.conf.json         # Proxy de Angular CLI para desarrollo
    frontend.Dockerfile     # (legacy) Build anterior, mantenido por compatibilidad
  backend/
    pocketbase.Dockerfile   # Imagen de PocketBase
    pb_migrations/          # Migraciones de base de datos
    pb_hooks/               # Hooks de PocketBase (ej. tmdb.pb.js)
    pb_data/                # Datos persistentes (NO versionado)
```

---

## Arquitectura del Frontend

Ver el archivo `PROGRESS.md` y `documentation.md` para la documentacion detallada de la arquitectura del frontend (DDD + Clean Architecture, Signals API, componentes standalone, estructura de directorios).

---

## Notas de Seguridad

- La `TMDB_API_KEY` nunca se expone al frontend. Solo el hook `tmdb.pb.js` en el servidor tiene acceso.
- PocketBase utiliza JWT para autenticacion. Los tokens se almacenan en localStorage del navegador.
- En produccion, el gateway Nginx oculta la topologia interna de la red de contenedores.
- El volumen `pb_data` en produccion debe ser respaldado periodicamente.
