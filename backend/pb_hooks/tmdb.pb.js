/// <reference path="../pb_data/types.d.ts" />

// Proxy para búsqueda de películas en TMDB
// Docs: https://pocketbase.io/docs/js-routing/ & https://pocketbase.io/docs/js-sending-http-requests/
routerAdd("GET", "/api/tmdb/search", (e) => {
    const query = e.request.url.query().get("query");
    const rawToken = $os.getenv("TMDB_API_KEY");
    const token = rawToken ? rawToken.trim() : "";

    if (!token) {
        console.error("[TMDB] TMDB_API_KEY no está configurada");
        return e.json(500, { error: "TMDB_API_KEY no configurada en el servidor" });
    }

    if (!query) {
        return e.json(400, { error: "El parámetro query es obligatorio" });
    }

    try {
        const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=es-MX&include_adult=false&api_key=${token}`;
        console.log("[TMDB] Buscando:", url);

        const res = $http.send({
            url: url,
            method: "GET",
            headers: {
                "Accept": "application/json",
                "User-Agent": "FilmStack/1.0"
            },
            timeout: 30
        });

        if (res.statusCode !== 200) {
            console.error("[TMDB] Error en búsqueda:", res.statusCode, JSON.stringify(res.json));
        }

        // res.json es una propiedad (ya parseada), no un método
        return e.json(res.statusCode, res.json);
    } catch (err) {
        console.error("[TMDB] Excepción en hook:", err.toString());
        return e.json(500, { error: "Error en el hook: " + err.toString() });
    }
});

// Proxy para detalles de una película específica
routerAdd("GET", "/api/tmdb/movie/{id}", (e) => {
    const id = e.request.pathValue("id");
    const rawToken = $os.getenv("TMDB_API_KEY");
    const token = rawToken ? rawToken.trim() : "";

    if (!token) {
        console.error("[TMDB] TMDB_API_KEY no está configurada");
        return e.json(500, { error: "TMDB_API_KEY no configurada en el servidor" });
    }

    if (!id) {
        return e.json(400, { error: "El ID de la película es obligatorio" });
    }

    try {
        const url = `https://api.themoviedb.org/3/movie/${id}?language=es-MX&append_to_response=credits,videos&api_key=${token}`;
        console.log("[TMDB] Obteniendo detalles:", url);

        const res = $http.send({
            url: url,
            method: "GET",
            headers: {
                "Accept": "application/json",
                "User-Agent": "FilmStack/1.0"
            },
            timeout: 30
        });

        if (res.statusCode !== 200) {
            console.error("[TMDB] Error en detalles:", res.statusCode, JSON.stringify(res.json));
        }

        return e.json(res.statusCode, res.json);
    } catch (err) {
        console.error("[TMDB] Excepción en hook:", err.toString());
        return e.json(500, { error: "Error en el hook: " + err.toString() });
    }
});

// Proxy para obtener la lista de géneros
routerAdd("GET", "/api/tmdb/genres", (e) => {
    const rawToken = $os.getenv("TMDB_API_KEY");
    const token = rawToken ? rawToken.trim() : "";

    if (!token) {
        return e.json(500, { error: "TMDB_API_KEY no configurada" });
    }

    try {
        const url = `https://api.themoviedb.org/3/genre/movie/list?language=es-MX&api_key=${token}`;
        const res = $http.send({
            url: url,
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });
        return e.json(res.statusCode, res.json);
    } catch (err) {
        return e.json(500, { error: err.toString() });
    }
});

// Proxy para discover de películas (para recomendador)
routerAdd("GET", "/api/tmdb/discover", (e) => {
    const rawToken = $os.getenv("TMDB_API_KEY");
    const token = rawToken ? rawToken.trim() : "";
    if (!token) {
        return e.json(500, { error: "TMDB_API_KEY no configurada" });
    }

    const query = e.request.url.query();
    const genres = query.get("genres") || "";
    const yearGte = query.get("year_gte") || "";
    const yearLte = query.get("year_lte") || "";
    const sortBy = query.get("sort_by") || "popularity.desc";
    const page = query.get("page") || "1";
    const voteGte = query.get("vote_gte") || "";
    const excludeIds = query.get("exclude_ids") || "";

    let url = `https://api.themoviedb.org/3/discover/movie?language=es-MX&include_adult=false&api_key=${token}&sort_by=${sortBy}&page=${page}`;
    if (genres) url += `&with_genres=${genres}`;
    if (yearGte) url += `&primary_release_date.gte=${yearGte}-01-01`;
    if (yearLte) url += `&primary_release_date.lte=${yearLte}-12-31`;
    if (voteGte) url += `&vote_average.gte=${voteGte}`;
    if (excludeIds) url += `&without_genres=${excludeIds}`;

    try {
        const res = $http.send({
            url: url,
            method: "GET",
            headers: { "Accept": "application/json", "User-Agent": "FilmStack/1.0" },
            timeout: 30
        });
        return e.json(res.statusCode, res.json);
    } catch (err) {
        return e.json(500, { error: err.toString() });
    }
});

// Proxy para detalles de una persona (actor/director)
routerAdd("GET", "/api/tmdb/person/{id}", (e) => {
    const id = e.request.pathValue("id");
    const rawToken = $os.getenv("TMDB_API_KEY");
    const token = rawToken ? rawToken.trim() : "";
    if (!token) {
        return e.json(500, { error: "TMDB_API_KEY no configurada" });
    }
    if (!id) {
        return e.json(400, { error: "El ID de la persona es obligatorio" });
    }

    try {
        const url = `https://api.themoviedb.org/3/person/${id}?language=es-MX&append_to_response=movie_credits&api_key=${token}`;
        const res = $http.send({
            url: url,
            method: "GET",
            headers: { "Accept": "application/json", "User-Agent": "FilmStack/1.0" },
            timeout: 30
        });
        return e.json(res.statusCode, res.json);
    } catch (err) {
        return e.json(500, { error: err.toString() });
    }
});
