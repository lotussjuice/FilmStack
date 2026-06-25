/// <reference path="../pb_data/types.d.ts" />

console.log("[forum] forum.pb.js loaded successfully");

const getFriendIds = function(auth) {
  let friendIds = [];
  if (!auth) return friendIds;
  try {
    const user = $app.findRecordById("users", auth.get("id"));
    const raw = user.get("friends");
    friendIds = Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error("[forum] getFriendIds:", err.toString());
  }
  return friendIds;
};

const getSortField = function(sort) {
  switch (sort) {
    case "activity": return "last_activity_at";
    case "comments": return "comment_count";
    case "created":
    default: return "created";
  }
};

routerAdd("GET", "/api/forum/threads", (e) => {
  console.log("[forum] GET /api/forum/threads called");
  try {
    const query = e.request.url.query();
    const page = parseInt(query.get("page") || "0");
    const perPage = Math.min(parseInt(query.get("perPage") || "20"), 50);
    const sort = query.get("sort") || "created";
    const order = query.get("order") || "desc";
    const visibility = query.get("visibility") || "all";
    const auth = e.auth;

    const friendIds = getFriendIds(auth);
    const userId = auth ? auth.get("id") : "";

    const sortField = getSortField(sort);
    const sortStr = order === "asc" ? sortField : "-" + sortField;
    let all = [];

    let filter = "deleted != true";

    if (visibility === "public") {
      filter += " && is_public = true";
    } else if (visibility === "friends" && userId) {
      var friendList = friendIds.map(function(id) { return '"' + id + '"'; }).join(",");
      if (friendList.length > 0) {
        filter += ' && (author = "' + userId + '" || author in [' + friendList + "])";
      } else {
        filter += ' && author = "' + userId + '"';
      }
    } else {
      if (userId) {
        var friendList = friendIds.map(function(id) { return '"' + id + '"'; }).join(",");
        if (friendList.length > 0) {
          filter += ' && (is_public = true || author = "' + userId + '" || author in [' + friendList + "])";
        } else {
          filter += ' && (is_public = true || author = "' + userId + '")';
        }
      } else {
        filter += " && is_public = true";
      }
    }

    all = $app.findRecordsByFilter("forum_threads", filter, sortStr, 1000, 0);

    var total = all.length;
    var start = page * perPage;
    var paged = all.slice(start, start + perPage);
    var threadIds = paged.map(function(r) { return r.get("id"); });

    var userVotes = [];
    if (auth && threadIds.length > 0) {
      try {
        var idsFilter = threadIds.map(function(id) { return '"' + id + '"'; }).join(",");
        var votes = $app.findRecordsByFilter("forum_votes", 'thread in [' + idsFilter + '] && user = "' + userId + '"', "", 100, 0);
        userVotes = votes.map(function(v) { return { thread: v.get("thread"), type: v.get("vote_type") }; });
      } catch (err) {
        console.error("[forum] load votes:", err.toString());
      }
    }

    var result = paged.map(function(r) {
      var authorId = r.get("author");
      var vote = userVotes.find(function(v) { return v.thread === r.get("id"); });
      return {
        id: r.get("id"),
        title: r.get("title"),
        content: r.get("content"),
        author_id: authorId,
        is_public: r.get("is_public"),
        upvotes: r.get("upvotes") || 0,
        downvotes: r.get("downvotes") || 0,
        comment_count: r.get("comment_count") || 0,
        last_activity_at: r.get("last_activity_at") || r.get("created"),
        edited: r.get("edited") || false,
        deleted: r.get("deleted") || false,
        created: r.get("created"),
        user_vote: vote ? vote.type : null,
      };
    });

    return e.json(200, {
      threads: result,
      total: total,
      page: page,
      perPage: perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (err) {
    console.error("[forum] GET /api/forum/threads error:", err.toString());
    return e.json(500, { code: 500, message: "Error al cargar hilos." });
  }
});

routerAdd("GET", "/api/forum/threads/{id}", (e) => {
  console.log("[forum] GET /api/forum/threads/{id} called");
  try {
    var id = e.request.pathValue("id");
    var auth = e.auth;
    var userId = auth ? auth.get("id") : "";
    var friendIds = getFriendIds(auth);

    var thread = $app.findRecordById("forum_threads", id);
    if (!thread) return e.json(404, { code: 404, message: "Hilo no encontrado." });

    var isPublic = thread.get("is_public");
    var authorId = thread.get("author");

    if (!isPublic && authorId !== userId && !friendIds.includes(authorId)) {
      return e.json(403, { code: 403, message: "No tienes permiso para ver este hilo." });
    }

    var userVote = null;
    if (auth) {
      try {
        var votes = $app.findRecordsByFilter("forum_votes", 'thread = "' + id + '" && user = "' + userId + '"', "", 1, 0);
        if (votes.length > 0) userVote = votes[0].get("vote_type");
      } catch (err) {}
    }

    var threadData = {
      id: thread.get("id"),
      title: thread.get("title"),
      content: thread.get("content"),
      author_id: authorId,
      is_public: isPublic,
      upvotes: thread.get("upvotes") || 0,
      downvotes: thread.get("downvotes") || 0,
      comment_count: thread.get("comment_count") || 0,
      last_activity_at: thread.get("last_activity_at") || thread.get("created"),
      edited: thread.get("edited") || false,
      deleted: thread.get("deleted") || false,
      created: thread.get("created"),
      user_vote: userVote,
    };

    var comments = $app.findRecordsByFilter("forum_comments", 'thread = "' + id + '"', "created", 1000, 0);

    var commentVotes = [];
    if (auth) {
      try {
        var commentIds = comments.map(function(c) { return '"' + c.get("id") + '"'; });
        if (commentIds.length > 0) {
          var votes = $app.findRecordsByFilter("forum_votes", 'comment in [' + commentIds.join(",") + '] && user = "' + userId + '"', "", 100, 0);
          commentVotes = votes.map(function(v) { return { comment: v.get("comment"), type: v.get("vote_type") }; });
        }
      } catch (err) {}
    }

    var commentData = comments.map(function(c) {
      var cAuthorId = c.get("author");
      var parentId = c.get("parent");
      var vote = commentVotes.find(function(v) { return v.comment === c.get("id"); });
      return {
        id: c.get("id"),
        thread: c.get("thread"),
        parent: parentId,
        author_id: cAuthorId,
        content: c.get("content"),
        upvotes: c.get("upvotes") || 0,
        downvotes: c.get("downvotes") || 0,
        depth: c.get("depth") || 0,
        edited: c.get("edited") || false,
        deleted: c.get("deleted") || false,
        created: c.get("created"),
        user_vote: vote ? vote.type : null,
      };
    });

    return e.json(200, { thread: threadData, comments: commentData });
  } catch (err) {
    console.error("[forum] GET /api/forum/threads/{id} error:", err.toString());
    return e.json(500, { code: 500, message: "Error al cargar el hilo." });
  }
});

routerAdd("POST", "/api/forum/threads", (e) => {
  console.log("[forum] POST /api/forum/threads called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var body = e.requestInfo().body;
    var title = (body.title || "").trim();
    var content = (body.content || "").trim();
    var isPublic = body.is_public !== false;

    if (!title) return e.json(400, { code: 400, message: "El titulo es requerido." });
    if (!content) return e.json(400, { code: 400, message: "El contenido es requerido." });

    var col = $app.findCollectionByNameOrId("forum_threads");
    var record = new Record(col);
    record.set("title", title);
    record.set("content", content);
    record.set("author", auth.get("id"));
    record.set("is_public", isPublic);
    record.set("upvotes", 0);
    record.set("downvotes", 0);
    record.set("comment_count", 0);
    record.set("last_activity_at", new Date().toISOString());
    record.set("edited", false);
    record.set("deleted", false);

    $app.save(record);
    return e.json(201, { id: record.get("id") });
  } catch (err) {
    console.error("[forum] POST /api/forum/threads error:", err.toString());
    return e.json(500, { code: 500, message: "Error al crear el hilo." });
  }
});

routerAdd("PATCH", "/api/forum/threads/{id}", (e) => {
  console.log("[forum] PATCH /api/forum/threads/{id} called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var id = e.request.pathValue("id");
    var body = e.requestInfo().body;
    var userId = auth.get("id");

    var record = $app.findRecordById("forum_threads", id);
    if (!record) return e.json(404, { code: 404, message: "Hilo no encontrado." });
    if (record.get("author") !== userId) {
      return e.json(403, { code: 403, message: "No eres el autor de este hilo." });
    }

    if (body.title !== undefined) record.set("title", (body.title || "").trim());
    if (body.content !== undefined) record.set("content", (body.content || "").trim());
    if (body.is_public !== undefined) record.set("is_public", body.is_public);
    record.set("edited", true);

    $app.save(record);
    return e.json(200, { id: record.get("id") });
  } catch (err) {
    console.error("[forum] PATCH /api/forum/threads/{id} error:", err.toString());
    return e.json(500, { code: 500, message: "Error al editar el hilo." });
  }
});

routerAdd("POST", "/api/forum/threads/{id}/delete", (e) => {
  console.log("[forum] POST /api/forum/threads/{id}/delete called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var id = e.request.pathValue("id");
    var userId = auth.get("id");

    var record = $app.findRecordById("forum_threads", id);
    if (!record) return e.json(404, { code: 404, message: "Hilo no encontrado." });
    if (record.get("author") !== userId) {
      return e.json(403, { code: 403, message: "No eres el autor de este hilo." });
    }

    record.set("deleted", true);
    record.set("content", "El usuario ha eliminado esta entrada");
    $app.save(record);
    return e.json(200, { id: record.get("id") });
  } catch (err) {
    console.error("[forum] DELETE /api/forum/threads/{id} error:", err.toString());
    return e.json(500, { code: 500, message: "Error al eliminar el hilo." });
  }
});

routerAdd("POST", "/api/forum/comments", (e) => {
  console.log("[forum] POST /api/forum/comments called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var body = e.requestInfo().body;
    var threadId = body.thread;
    var content = (body.content || "").trim();
    var parentId = body.parent || null;

    if (!threadId) return e.json(400, { code: 400, message: "El hilo es requerido." });
    if (!content) return e.json(400, { code: 400, message: "El contenido es requerido." });

    var thread = $app.findRecordById("forum_threads", threadId);
    if (!thread) return e.json(404, { code: 404, message: "Hilo no encontrado." });

    var depth = 0;
    if (parentId) {
      var parent = $app.findRecordById("forum_comments", parentId);
      if (parent) {
        depth = (parent.get("depth") || 0) + 1;
      }
    }

    var col = $app.findCollectionByNameOrId("forum_comments");
    var record = new Record(col);
    record.set("thread", threadId);
    record.set("parent", parentId);
    record.set("author", auth.get("id"));
    record.set("content", content);
    record.set("upvotes", 0);
    record.set("downvotes", 0);
    record.set("depth", depth);
    record.set("edited", false);
    record.set("deleted", false);

    $app.save(record);

    thread.set("comment_count", (thread.get("comment_count") || 0) + 1);
    thread.set("last_activity_at", new Date().toISOString());
    $app.save(thread);

    return e.json(201, { id: record.get("id") });
  } catch (err) {
    console.error("[forum] POST /api/forum/comments error:", err.toString());
    return e.json(500, { code: 500, message: "Error al crear el comentario." });
  }
});

routerAdd("PATCH", "/api/forum/comments/{id}", (e) => {
  console.log("[forum] PATCH /api/forum/comments/{id} called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var id = e.request.pathValue("id");
    var body = e.requestInfo().body;
    var userId = auth.get("id");

    var record = $app.findRecordById("forum_comments", id);
    if (!record) return e.json(404, { code: 404, message: "Comentario no encontrado." });
    if (record.get("author") !== userId) {
      return e.json(403, { code: 403, message: "No eres el autor de este comentario." });
    }

    if (body.content !== undefined) record.set("content", (body.content || "").trim());
    record.set("edited", true);

    $app.save(record);
    return e.json(200, { id: record.get("id") });
  } catch (err) {
    console.error("[forum] PATCH /api/forum/comments/{id} error:", err.toString());
    return e.json(500, { code: 500, message: "Error al editar el comentario." });
  }
});

routerAdd("POST", "/api/forum/comments/{id}/delete", (e) => {
  console.log("[forum] POST /api/forum/comments/{id}/delete called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var id = e.request.pathValue("id");
    var userId = auth.get("id");

    var record = $app.findRecordById("forum_comments", id);
    if (!record) return e.json(404, { code: 404, message: "Comentario no encontrado." });
    if (record.get("author") !== userId) {
      return e.json(403, { code: 403, message: "No eres el autor de este comentario." });
    }

    record.set("deleted", true);
    record.set("content", "El usuario ha eliminado esta respuesta");
    $app.save(record);
    return e.json(200, { id: record.get("id") });
  } catch (err) {
    console.error("[forum] DELETE /api/forum/comments/{id} error:", err.toString());
    return e.json(500, { code: 500, message: "Error al eliminar el comentario." });
  }
});

routerAdd("POST", "/api/forum/vote", (e) => {
  console.log("[forum] POST /api/forum/vote called");
  try {
    var auth = e.auth;
    if (!auth) return e.json(401, { code: 401, message: "No autenticado." });

    var body = e.requestInfo().body;
    var threadId = body.thread || null;
    var commentId = body.comment || null;
    var voteType = body.vote_type;
    var userId = auth.get("id");

    if (!threadId && !commentId) {
      return e.json(400, { code: 400, message: "Se requiere un hilo o comentario." });
    }
    if (!voteType || (voteType !== "upvote" && voteType !== "downvote")) {
      return e.json(400, { code: 400, message: "Tipo de voto invalido." });
    }

    if (threadId && commentId) {
      return e.json(400, { code: 400, message: "Solo se puede votar un objetivo a la vez." });
    }

    var filter = 'user = "' + userId + '"';
    if (threadId) filter += ' && thread = "' + threadId + '"';
    if (commentId) filter += ' && comment = "' + commentId + '"';

    var existing = $app.findRecordsByFilter("forum_votes", filter, "", 1, 0);
    var targetColName = threadId ? "forum_threads" : "forum_comments";
    var targetId = threadId || commentId;
    var target = $app.findRecordById(targetColName, targetId);
    if (!target) return e.json(404, { code: 404, message: "Objetivo no encontrado." });

    var currentUpvotes = target.get("upvotes") || 0;
    var currentDownvotes = target.get("downvotes") || 0;

    if (existing.length > 0) {
      var existingVote = existing[0];
      var existingType = existingVote.get("vote_type");

      if (existingType === voteType) {
        $app.delete(existingVote);
        if (voteType === "upvote") {
          target.set("upvotes", Math.max(0, currentUpvotes - 1));
        } else {
          target.set("downvotes", Math.max(0, currentDownvotes - 1));
        }
        $app.save(target);
        return e.json(200, { action: "removed", upvotes: target.get("upvotes"), downvotes: target.get("downvotes") });
      } else {
        existingVote.set("vote_type", voteType);
        $app.save(existingVote);
        if (voteType === "upvote") {
          target.set("upvotes", currentUpvotes + 1);
          target.set("downvotes", Math.max(0, currentDownvotes - 1));
        } else {
          target.set("upvotes", Math.max(0, currentUpvotes - 1));
          target.set("downvotes", currentDownvotes + 1);
        }
        $app.save(target);
        return e.json(200, { action: "changed", upvotes: target.get("upvotes"), downvotes: target.get("downvotes") });
      }
    } else {
      var voteCol = $app.findCollectionByNameOrId("forum_votes");
      var newVote = new Record(voteCol);
      newVote.set("thread", threadId);
      newVote.set("comment", commentId);
      newVote.set("user", userId);
      newVote.set("vote_type", voteType);
      $app.save(newVote);
      if (voteType === "upvote") {
        target.set("upvotes", currentUpvotes + 1);
      } else {
        target.set("downvotes", currentDownvotes + 1);
      }
      $app.save(target);
      return e.json(200, { action: "created", upvotes: target.get("upvotes"), downvotes: target.get("downvotes") });
    }
  } catch (err) {
    console.error("[forum] POST /api/forum/vote error:", err.toString());
    return e.json(500, { code: 500, message: "Error al procesar el voto." });
  }
});
