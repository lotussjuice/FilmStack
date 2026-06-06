migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.updateRule = "@request.auth.id != ''";

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.updateRule = "@request.auth.role = 'admin' || id = @request.auth.id";
  return app.save(users);
});
