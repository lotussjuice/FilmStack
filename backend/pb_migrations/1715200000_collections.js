migrate((app) => {
  const collection = new Collection({
    id: "movies_collection",
    name: "movies",
    type: "base",
  });

  // Removed manual id field to let PocketBase handle it automatically
  collection.fields.add(new NumberField({
    name: "tmdb_id",
    required: true,
  }));
  collection.fields.add(new SelectField({
    name: "status",
    required: true,
    values: ["pending", "watched", "dropped"],
    maxSelect: 1,
  }));
  collection.fields.add(new NumberField({
    name: "rating",
  }));
  collection.fields.add(new TextField({
    name: "review",
  }));
  collection.fields.add(new BoolField({
    name: "is_favorite",
  }));
  collection.fields.add(new RelationField({
    name: "user_id",
    required: true,
    collectionId: "_pb_users_auth_",
    cascadeDelete: true,
    maxSelect: 1,
  }));
  collection.fields.add(new AutodateField({
    name: "created",
    system: true,
    onCreate: true,
  }));
  collection.fields.add(new AutodateField({
    name: "updated",
    system: true,
    onCreate: true,
    onUpdate: true,
  }));

  collection.listRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  collection.viewRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  collection.createRule = "@request.auth.id != '' && user_id = @request.auth.id";
  collection.updateRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";
  collection.deleteRule = "@request.auth.role = 'admin' || user_id = @request.auth.id";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("movies");
  return app.delete(collection);
});
