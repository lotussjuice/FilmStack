migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    users.createRule = "";
    users.listRule = "@request.auth.id != ''";
    users.viewRule = "@request.auth.id != ''";
    users.updateRule = "@request.auth.id != ''";

    if (users.passwordAuth) {
        users.passwordAuth.identityFields = ["email"];
    }

    return app.save(users);
}, (app) => {
    const users = app.findCollectionByNameOrId("users");

    users.createRule = null;
    users.listRule = null;
    users.viewRule = null;
    users.updateRule = null;

    return app.save(users);
});
