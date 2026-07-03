migrate((app) => {
  const collection = new Collection({
    name: "group_reviews",
    type: "base",
  });

  const watchparties = app.findCollectionByNameOrId("watchparties");

  collection.fields.add(new RelationField({
    name: "watchparty",
    required: true,
    collectionId: watchparties.id,
    cascadeDelete: true,
    maxSelect: 1,
  }));

  collection.fields.add(new RelationField({
    name: "user",
    required: true,
    collectionId: "_pb_users_auth_",
    cascadeDelete: true,
    maxSelect: 1,
  }));

  collection.fields.add(new NumberField({
    name: "tmdb_id",
    required: true,
  }));

  collection.fields.add(new NumberField({ name: "rating" }));

  collection.fields.add(new TextField({
    name: "review",
    maxSize: 5000,
  }));

  collection.fields.add(new TextField({
    name: "user_name",
    maxSize: 200,
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
    "CREATE INDEX IF NOT EXISTS idx_groupreviews_wp_user ON group_reviews (watchparty, user)"
  ];

  collection.listRule = "watchparty.members ~ @request.auth.id || watchparty.host = @request.auth.id";
  collection.viewRule = "watchparty.members ~ @request.auth.id || watchparty.host = @request.auth.id";
  collection.createRule = "@request.auth.id != '' && user = @request.auth.id";
  collection.updateRule = "user = @request.auth.id";
  collection.deleteRule = "user = @request.auth.id || @request.auth.role = 'admin'";

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("group_reviews");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
});
