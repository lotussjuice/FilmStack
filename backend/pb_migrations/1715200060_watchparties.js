migrate((app) => {
  const collection = new Collection({
    name: "watchparties",
    type: "base",
  });

  collection.fields.add(new RelationField({
    name: "host",
    required: true,
    collectionId: "_pb_users_auth_",
    cascadeDelete: true,
    maxSelect: 1,
  }));

  collection.fields.add(new RelationField({
    name: "members",
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 999,
  }));

  collection.fields.add(new SelectField({
    name: "status",
    required: true,
    values: ["lobby", "voting", "watching", "finished"],
    maxSelect: 1,
  }));

  collection.fields.add(new NumberField({ name: "active_movie" }));
  collection.fields.add(new NumberField({ name: "active_movie_tmdb" }));
  collection.fields.add(new TextField({ name: "active_movie_title" }));
  collection.fields.add(new TextField({ name: "active_movie_poster" }));
  collection.fields.add(new TextField({ name: "started_at" }));
  collection.fields.add(new TextField({ name: "finished_at" }));

  collection.fields.add(new TextField({
    name: "chat_messages",
    maxSize: 1000000,
  }));
  collection.fields.add(new TextField({
    name: "votes",
    maxSize: 100000,
  }));
  collection.fields.add(new TextField({
    name: "spin_pool",
    maxSize: 100000,
  }));

  collection.fields.add(new BoolField({ name: "is_active" }));

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

  collection.listRule = "host = @request.auth.id || members ~ @request.auth.id";
  collection.viewRule = "host = @request.auth.id || members ~ @request.auth.id";
  collection.createRule = "@request.auth.id != '' && host = @request.auth.id";
  collection.updateRule = "host = @request.auth.id || members ~ @request.auth.id";
  collection.deleteRule = "host = @request.auth.id";

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("watchparties");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
});
