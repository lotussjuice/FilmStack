migrate((app) => {
  const collection = new Collection({
    id: "rankings_view_unique",
    name: "rankings",
    type: "view",
    viewQuery: `
      SELECT 
        (ROW_NUMBER() OVER()) as id,
        tmdb_id,
        AVG(rating) as avg_rating,
        COUNT(id) as total_votes
      FROM movies
      WHERE rating > 0
      GROUP BY tmdb_id
    `,
    listRule: "",
    viewRule: ""
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("rankings");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
});
