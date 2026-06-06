migrate((app) => {
  const collection = app.findCollectionByNameOrId("rankings");
  if (!collection) return null;

  collection.viewQuery = `
    SELECT
      (ROW_NUMBER() OVER (ORDER BY tmdb_id)) as id,
      tmdb_id,
      AVG(rating) as avg_rating,
      COUNT(id) as total_votes,
      SUM(CASE WHEN source = 'group' THEN 1 ELSE 0 END) as group_votes
    FROM (
      SELECT id, tmdb_id, rating, 'personal' as source FROM movies WHERE rating > 0
      UNION ALL
      SELECT id, tmdb_id, rating, 'group' as source FROM group_reviews WHERE rating > 0
    )
    GROUP BY tmdb_id
  `;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("rankings");
  if (!collection) return null;

  collection.viewQuery = `
    SELECT
      (ROW_NUMBER() OVER()) as id,
      tmdb_id,
      AVG(rating) as avg_rating,
      COUNT(id) as total_votes
    FROM movies
    WHERE rating > 0
    GROUP BY tmdb_id
  `;

  return app.save(collection);
});
