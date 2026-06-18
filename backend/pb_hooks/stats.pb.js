/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/stats/user", (e) => {
  const auth = e.auth;
  if (!auth) {
    return e.json(401, { code: 401, message: "No autenticado." });
  }

  const userId = auth.get("id");

  const movies = $app.findRecordsByFilter(
    "movies",
    "user_id = {:userId}",
    "-created",
    0, 0,
    { userId }
  );

  const watched = movies.filter((m) => m.get("status") === "watched");
  const pending = movies.filter((m) => m.get("status") === "pending");
  const dropped = movies.filter((m) => m.get("status") === "dropped");
  const favorites = movies.filter((m) => m.get("is_favorite") === true);

  const ratings = watched.filter((m) => m.get("rating") > 0).map((m) => m.get("rating"));
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  const tmdbIds = watched.map((m) => m.get("tmdb_id")).filter((id) => id > 0);

  return e.json(200, {
    total: movies.length,
    watched: watched.length,
    pending: pending.length,
    dropped: dropped.length,
    favorites: favorites.length,
    avgRating: avgRating,
    totalRated: ratings.length,
    tmdb_ids: tmdbIds,
  });
});

routerAdd("GET", "/api/stats/friends-recent", (e) => {
  const auth = e.auth;
  if (!auth) {
    return e.json(401, { code: 401, message: "No autenticado." });
  }

  try {
    const user = $app.findRecordById("users", auth.get("id"));
    const rawFriends = user.get("friends");
    const friendIds = Array.isArray(rawFriends) ? rawFriends : [];

    if (friendIds.length === 0) {
      return e.json(200, { reviews: [] });
    }

    const allReviews = [];
    for (const friendId of friendIds) {
      try {
        const col = $app.findCollectionByNameOrId("movie_reviews");
        const friendReviews = $app.findRecordsByFilter(
          col,
          `user = '${friendId}'`,
          "-created",
          5, 0
        );
        if (friendReviews) {
          for (const r of friendReviews) {
            if (!r) continue;
            allReviews.push({
              id: r.get("id"),
              tmdb_id: r.get("tmdb_id"),
              user_id: r.get("user"),
              user_name: r.get("user_name"),
              rating: r.get("rating"),
              review_text: r.get("review_text"),
              source: r.get("source"),
              created: r.get("created"),
            });
          }
        }
      } catch (err) {}
    }

    allReviews.sort((a, b) => {
      const da = String(a.created || "");
      const db = String(b.created || "");
      return db.localeCompare(da);
    });

    return e.json(200, { reviews: allReviews.slice(0, 20) });
  } catch (err) {
    return e.json(500, { code: 500, message: "Error cargando actividad de amigos." });
  }
});

routerAdd("GET", "/api/stats/home", (e) => {
  const auth = e.auth;
  if (!auth) {
    return e.json(401, { code: 401, message: "No autenticado." });
  }

  try {
    const userId = auth.get("id");

    let movies = [];
    try {
      movies = $app.findRecordsByFilter(
        "movies",
        "user_id = {:userId}",
        "-updated",
        0, 0,
        { userId }
      );
    } catch (err) {
      console.error("[stats/home] Error finding movies:", err.toString());
    }

    const watched = movies.filter((m) => m.get("status") === "watched");
    const pending = movies.filter((m) => m.get("status") === "pending");
    const favorites = movies.filter((m) => m.get("is_favorite") === true);

    const ratings = watched.filter((m) => m.get("rating") > 0).map((m) => m.get("rating"));
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    let lastWatched = null;
    if (watched.length > 0) {
      const sorted = [...watched].sort((a, b) => {
        const ua = String(a.get("updated") || "");
        const ub = String(b.get("updated") || "");
        return ub.localeCompare(ua);
      });
      const last = sorted[0];
      lastWatched = {
        tmdb_id: last.get("tmdb_id"),
        rating: last.get("rating"),
        review: last.get("review"),
        updated: last.get("updated"),
      };
    }

    let friendIds = [];
    try {
      const user = $app.findRecordById("users", userId);
      const rawFriends = user.get("friends");
      friendIds = Array.isArray(rawFriends) ? rawFriends : [];
    } catch (err) {}

    const friendsRecent = [];
    for (const fid of friendIds.slice(0, 10)) {
      try {
        const col = $app.findCollectionByNameOrId("movie_reviews");
        const reviews = $app.findRecordsByFilter(
          col,
          `user = '${fid}'`,
          "-created",
          2, 0
        );
        if (reviews) {
          for (const r of reviews) {
            if (!r) continue;
            let userName = r.get("user_name");
            if (!userName) {
              try {
                const fu = $app.findRecordById("users", fid);
                userName = fu.get("name") || "Amigo";
              } catch (e2) {
                userName = "Amigo";
              }
            }
            friendsRecent.push({
              tmdb_id: r.get("tmdb_id"),
              user_name: userName,
              user_id: fid,
              rating: r.get("rating"),
              review_text: r.get("review_text"),
              created: r.get("created"),
            });
          }
        }
      } catch (err) {
        console.error("[stats/home] Error fetching friend reviews:", err.toString());
      }
    }

    friendsRecent.sort((a, b) => {
      const da = String(a.created || "");
      const db = String(b.created || "");
      return db.localeCompare(da);
    });

    return e.json(200, {
      summary: {
        total: movies.length,
        watched: watched.length,
        pending: pending.length,
        favorites: favorites.length,
        avgRating: avgRating,
      },
      lastWatched: lastWatched,
      friendsRecent: friendsRecent.slice(0, 10),
    });
  } catch (err) {
    console.error("[stats/home] Fatal error:", err.toString());
    return e.json(500, { code: 500, message: "Error cargando datos del home." });
  }
});
