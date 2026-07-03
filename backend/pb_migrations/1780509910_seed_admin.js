migrate((app) => {
    const superusers = app.findCollectionByNameOrId("_superusers");

    const email = $os.getenv("ADMIN_EMAIL") || "admin@filmstack.cl";
    const password = $os.getenv("ADMIN_PASSWORD") || "test12345678";

    const existing = app.findRecordsByFilter("_superusers", "email = {:email}", "", 1, 0, {email: email});
    if (existing.length > 0) {
        const record = existing[0];
        record.setPassword(password);
        record.set("verified", true);
        app.save(record);
        console.log("[seed] Admin password updated:", email);
        return;
    }

    const record = new Record(superusers);
    record.set("email", email);
    record.setPassword(password);
    record.set("verified", true);
    app.save(record);

    console.log("[seed] Admin created:", email);
}, (app) => {});
