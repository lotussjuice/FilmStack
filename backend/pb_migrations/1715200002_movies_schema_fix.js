migrate((app) => {
  const collection = app.findCollectionByNameOrId("movies");

  // 1. Asegurar que el campo 'review' existe
  try {
    collection.fields.add(new TextField({
      name: "review",
      required: false,
    }));
  } catch (e) {
    // Ya existe
  }

  // 2. Estabilizar el campo 'id' para evitar errores de validación en creación
  const idField = collection.fields.getByName("id");
  if (idField) {
    idField.required = false;
    idField.pattern = ""; // Eliminamos patrones restrictivos que choquen con la autogeneración
    idField.autogeneratePattern = "[a-z0-9]{15}";
  }

  // 3. Asegurar reglas de API consistentes
  collection.createRule = "@request.auth.id != '' && user_id = @request.auth.id";
  collection.listRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  collection.viewRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  collection.updateRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  collection.deleteRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";

  return app.save(collection);
}, (app) => {
  return null;
});
