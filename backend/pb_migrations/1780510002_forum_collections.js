migrate((app) => {
    const threads = new Collection({
        name: "forum_threads",
        type: "base",
    });

    threads.fields.add(new TextField({ name: "title", required: true, max: 500 }));
    threads.fields.add(new TextField({ name: "content", required: true }));
    threads.fields.add(new RelationField({
        name: "author",
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        maxSelect: 1,
    }));
    threads.fields.add(new BoolField({ name: "is_public", required: true }));
    threads.fields.add(new NumberField({ name: "upvotes" }));
    threads.fields.add(new NumberField({ name: "downvotes" }));
    threads.fields.add(new NumberField({ name: "comment_count" }));
    threads.fields.add(new TextField({ name: "last_activity_at" }));
    threads.fields.add(new BoolField({ name: "edited" }));
    threads.fields.add(new BoolField({ name: "deleted" }));
    threads.fields.add(new AutodateField({ name: "created", system: true, onCreate: true }));
    threads.fields.add(new AutodateField({ name: "updated", system: true, onCreate: true, onUpdate: true }));

    threads.listRule = "@request.auth.id != ''";
    threads.viewRule = "@request.auth.id != ''";
    threads.createRule = "@request.auth.id != ''";
    threads.updateRule = "@request.auth.id != '' && author = @request.auth.id";
    threads.deleteRule = null;

    app.save(threads);

    const comments = new Collection({
        name: "forum_comments",
        type: "base",
    });

    comments.fields.add(new RelationField({
        name: "thread",
        required: true,
        collectionId: threads.id,
        cascadeDelete: true,
        maxSelect: 1,
    }));
    comments.fields.add(new RelationField({
        name: "parent",
        collectionId: comments.id,
        maxSelect: 1,
    }));
    comments.fields.add(new RelationField({
        name: "author",
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        maxSelect: 1,
    }));
    comments.fields.add(new TextField({ name: "content", required: true }));
    comments.fields.add(new NumberField({ name: "upvotes" }));
    comments.fields.add(new NumberField({ name: "downvotes" }));
    comments.fields.add(new NumberField({ name: "depth" }));
    comments.fields.add(new BoolField({ name: "edited" }));
    comments.fields.add(new BoolField({ name: "deleted" }));
    comments.fields.add(new AutodateField({ name: "created", system: true, onCreate: true }));
    comments.fields.add(new AutodateField({ name: "updated", system: true, onCreate: true, onUpdate: true }));

    comments.listRule = "@request.auth.id != ''";
    comments.viewRule = "@request.auth.id != ''";
    comments.createRule = "@request.auth.id != ''";
    comments.updateRule = "@request.auth.id != '' && author = @request.auth.id";
    comments.deleteRule = null;

    app.save(comments);

    const votes = new Collection({
        name: "forum_votes",
        type: "base",
    });

    votes.fields.add(new RelationField({
        name: "thread",
        collectionId: threads.id,
        maxSelect: 1,
    }));
    votes.fields.add(new RelationField({
        name: "comment",
        collectionId: comments.id,
        maxSelect: 1,
    }));
    votes.fields.add(new RelationField({
        name: "user",
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        maxSelect: 1,
    }));
    votes.fields.add(new SelectField({
        name: "vote_type",
        required: true,
        values: ["upvote", "downvote"],
        maxSelect: 1,
    }));
    votes.fields.add(new AutodateField({ name: "created", system: true, onCreate: true }));

    votes.listRule = "@request.auth.id != ''";
    votes.viewRule = "@request.auth.id != ''";
    votes.createRule = "@request.auth.id != ''";
    votes.updateRule = "@request.auth.id != '' && user = @request.auth.id";
    votes.deleteRule = "@request.auth.id != '' && user = @request.auth.id";

    app.save(votes);
}, (app) => {
    const threads = app.findCollectionByNameOrId("forum_threads");
    if (threads) app.delete(threads);
    const comments = app.findCollectionByNameOrId("forum_comments");
    if (comments) app.delete(comments);
    const votes = app.findCollectionByNameOrId("forum_votes");
    if (votes) app.delete(votes);
});
