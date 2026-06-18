/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/reviews/movie/{tmdbId}", (e) => {
  const tmdbId = parseInt(e.request.pathValue("tmdbId"));
  if (isNaN(tmdbId)) {
    return e.json(400, { code: 400, message: "tmdbId invalido." });
  }

  let reviews = [];
  try {
    const col = $app.findCollectionByNameOrId("movie_reviews");
    const filter = `tmdb_id = ${tmdbId}`;
    const all = $app.findRecordsByFilter(col, filter, "-created", 100, 0);
    reviews = all.filter(Boolean);
  } catch (err) {
    console.error("[movie-reviews] Error:", err.toString());
    reviews = [];
  }

  let friendIds = [];
  const auth = e.auth;
  if (auth) {
    try {
      const user = $app.findRecordById("users", auth.get("id"));
      const rawFriends = user.get("friends");
      friendIds = Array.isArray(rawFriends) ? rawFriends : [];
    } catch (err) {}
  }

  const result = reviews.map((r) => {
    const userId = r.get("user");
    return {
      id: r.get("id"),
      tmdb_id: r.get("tmdb_id"),
      user_id: userId,
      user_name: r.get("user_name"),
      rating: r.get("rating"),
      review_text: r.get("review_text"),
      source: r.get("source"),
      created: r.get("created"),
      is_friend: friendIds.includes(userId),
    };
  });

  return e.json(200, { reviews: result });
});
