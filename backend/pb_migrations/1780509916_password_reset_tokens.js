migrate((app) => {
  const collection = new Collection({
    id: "password_reset_tokens",
    name: "password_reset_tokens",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  collection.fields.add(new RelationField({
    name: "userId",
    required: true,
    collectionId: "_pb_users_auth_",
    cascadeDelete: true,
    maxSelect: 1,
  }));
  collection.fields.add(new TextField({
    name: "token",
    required: true,
    unique: true,
  }));
  collection.fields.add(new DateField({
    name: "expiresAt",
    required: true,
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

  return app.save(collection);
});
