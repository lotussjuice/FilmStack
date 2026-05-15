migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // Add role and deleted fields
  users.fields.add(new SelectField({
    name: "role",
    required: true,
    values: ["guest", "user", "admin"],
    maxSelect: 1,
  }));

  users.fields.add(new BoolField({
    name: "deleted",
  }));

  // Set API Rules for users
  users.listRule = "(@request.auth.role = 'admin' && deleted = false) || id = @request.auth.id";
  users.viewRule = "(@request.auth.role = 'admin' && deleted = false) || id = @request.auth.id";
  users.updateRule = "@request.auth.role = 'admin' || id = @request.auth.id";
  users.deleteRule = null;

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("role");
  users.fields.removeByName("deleted");
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.updateRule = "id = @request.auth.id";
  return app.save(users);
});
