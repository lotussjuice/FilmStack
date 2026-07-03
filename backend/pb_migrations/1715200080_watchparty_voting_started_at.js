/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("watchparties");
  if (!collection) return;

  collection.fields.add(new TextField({
    name: "voting_started_at",
    required: false,
    maxSize: 64,
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("watchparties");
    if (!collection) return null;
    const field = collection.fields.findByName("voting_started_at");
    if (field) {
      collection.fields.remove(field);
      return app.save(collection);
    }
    return null;
  } catch (e) {
    return null;
  }
});
