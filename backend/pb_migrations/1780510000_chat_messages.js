migrate((app) => {
  const watchparties = app.findCollectionByNameOrId("watchparties");

  const collection = new Collection({
    name: "chat_messages",
    type: "base",
  });

  collection.fields.add(new RelationField({
    name: "party_id",
    required: true,
    collectionId: watchparties.id,
    cascadeDelete: true,
    maxSelect: 1,
  }));

  collection.fields.add(new TextField({
    name: "user_id",
    required: true,
    maxSize: 100,
  }));

  collection.fields.add(new TextField({
    name: "user_name",
    required: true,
    maxSize: 200,
  }));

  collection.fields.add(new TextField({
    name: "text",
    required: true,
    maxSize: 5000,
  }));

  collection.fields.add(new SelectField({
    name: "type",
    required: true,
    values: ["text", "proposal", "system"],
    maxSelect: 1,
  }));

  collection.fields.add(new TextField({
    name: "proposal_data",
    required: false,
    maxSize: 10000,
  }));

  collection.fields.add(new AutodateField({
    name: "created",
    system: true,
    onCreate: true,
  }));

  collection.listRule = "party_id.host = @request.auth.id || party_id.members ~ @request.auth.id";
  collection.viewRule = "party_id.host = @request.auth.id || party_id.members ~ @request.auth.id";
  collection.createRule = "party_id.host = @request.auth.id || party_id.members ~ @request.auth.id";
  collection.updateRule = "party_id.host = @request.auth.id || party_id.members ~ @request.auth.id";
  collection.deleteRule = "party_id.host = @request.auth.id";

  collection.indexes = [
    "CREATE INDEX IF NOT EXISTS idx_chatmsgs_party ON chat_messages (party_id)",
    "CREATE INDEX IF NOT EXISTS idx_chatmsgs_created ON chat_messages (created)"
  ];

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("chat_messages");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
});
