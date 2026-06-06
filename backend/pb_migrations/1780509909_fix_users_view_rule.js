migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // Allow any authenticated user to list/view/update other users
  // Required for friend requests, watchparty invites, and social features
  users.listRule = "@request.auth.id != ''";
  users.viewRule = "@request.auth.id != ''";
  users.updateRule = "@request.auth.id != ''";

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.updateRule = "id = @request.auth.id";
  return app.save(users);
});
