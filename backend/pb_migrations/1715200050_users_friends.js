migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new RelationField({
    name: "friends",
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 999,
  }));

  users.fields.add(new RelationField({
    name: "friend_requests_sent",
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 999,
  }));

  users.fields.add(new RelationField({
    name: "friend_requests_received",
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 999,
  }));

  users.viewRule = "(@request.auth.role = 'admin' && deleted = false) || id = @request.auth.id";

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  try { users.fields.removeByName("friends"); } catch (e) {}
  try { users.fields.removeByName("friend_requests_sent"); } catch (e) {}
  try { users.fields.removeByName("friend_requests_received"); } catch (e) {}
  return app.save(users);
});
