migrate((app) => {
    const collection = app.findCollectionByNameOrId("group_reviews");

    collection.listRule = "watchparty.members ~ @request.auth.id || watchparty.host = @request.auth.id || watchparty.confirmed_members ~ @request.auth.id";
    collection.viewRule = "watchparty.members ~ @request.auth.id || watchparty.host = @request.auth.id || watchparty.confirmed_members ~ @request.auth.id";

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("group_reviews");
    collection.listRule = "watchparty.members ~ @request.auth.id || watchparty.host = @request.auth.id";
    collection.viewRule = "watchparty.members ~ @request.auth.id || watchparty.host = @request.auth.id";
    return app.save(collection);
});
