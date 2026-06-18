migrate((app) => {
  const collection = new Collection({
    name: "movie_reviews",
    type: "base",
  });

  collection.fields.add(new NumberField({
    name: "tmdb_id",
    required: true,
  }));

  collection.fields.add(new RelationField({
    name: "user",
    required: true,
    collectionId: "_pb_users_auth_",
    cascadeDelete: true,
    maxSelect: 1,
  }));

  collection.fields.add(new TextField({
    name: "user_name",
    required: true,
    maxSize: 200,
  }));

  collection.fields.add(new NumberField({
    name: "rating",
  }));

  collection.fields.add(new TextField({
    name: "review_text",
    maxSize: 5000,
  }));

  collection.fields.add(new SelectField({
    name: "source",
    required: true,
    values: ["backlog", "watchparty"],
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

  collection.indexes = [
    "CREATE INDEX IF NOT EXISTS idx_moviereviews_tmdb ON movie_reviews (tmdb_id)",
    "CREATE INDEX IF NOT EXISTS idx_moviereviews_user ON movie_reviews (user)",
    "CREATE INDEX IF NOT EXISTS idx_moviereviews_tmdb_created ON movie_reviews (tmdb_id, created)"
  ];

  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "@request.auth.id != '' && user = @request.auth.id";
  collection.updateRule = "user = @request.auth.id";
  collection.deleteRule = "user = @request.auth.id || @request.auth.role = 'admin'";

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("movie_reviews");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
});
