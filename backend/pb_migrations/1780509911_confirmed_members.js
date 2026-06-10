migrate((app) => {
    const collection = app.findCollectionByNameOrId("watchparties");

    collection.fields.add(new RelationField({
        name: "confirmed_members",
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 999,
    }));

    collection.listRule = "host = @request.auth.id || members ~ @request.auth.id || confirmed_members ~ @request.auth.id";
    collection.viewRule = "host = @request.auth.id || members ~ @request.auth.id || confirmed_members ~ @request.auth.id";
    collection.updateRule = "host = @request.auth.id || members ~ @request.auth.id || confirmed_members ~ @request.auth.id";

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("watchparties");
    collection.fields.removeByName("confirmed_members");
    collection.listRule = "host = @request.auth.id || members ~ @request.auth.id";
    collection.viewRule = "host = @request.auth.id || members ~ @request.auth.id";
    collection.updateRule = "host = @request.auth.id || members ~ @request.auth.id";
    return app.save(collection);
});
