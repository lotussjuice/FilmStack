// Endpoint de depuración para revisar el esquema de la colección 'movies'
routerAdd("GET", "/api/debug/schema", (e) => {
    const collection = $app.findCollectionByNameOrId("movies");
    return e.json(200, collection);
});
