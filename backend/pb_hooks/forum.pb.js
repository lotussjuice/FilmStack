/// <reference path="../pb_data/types.d.ts" />

console.log("[forum] forum.pb.js loaded successfully");

// ─── GET /api/forum/threads ──────────────────────────────────────────────────
routerAdd("GET", "/api/forum/threads", function(e) {
  console.log("[forum] GET /api/forum/threads called");
  try {
    var auth = e.auth;
    var userId = auth ? auth.get("id") : "";
    var friendIds = [];
    if (auth) {
      try {
        var user = $app.findRecordById("users", userId);
        var rawFriends = user.get("friends");
        friendIds = Array.isArray(rawFriends) ? rawFriends : [];
      } catch (err) {}
    }

    var query = e.request.url.query();
    var page = parseInt(query.get("page") || "0");
    var perPage = Math.min(parseInt(query.get("perPage") || "20"), 50);
    var sort = query.get("sort") || "created";
    var order = query.get("order") || "desc";
    var visibility = query.get("visibility") || "all";

    var sortField = "created";
    if (sort === "activity") sortField = "last_activity_at";
    else if (sort === "comments") sortField = "comment_count";
    var sortStr = order === "asc" ? sortField : "-" + sortField;

    var filter = "deleted != true";

    if (visibility === "public") {
      filter += " && is_public = true";
    } else if (visibility === "friends" && userId) {
      if (friendIds.length > 0) {
        var fl = friendIds.map(function(id) { return 'author = "' + id + '"'; }).join(" || ");
        filter += " && (author = \"" + userId + "\" || " + fl + ")";
      } else {
        filter += ' && author = "' + userId + '"';
      }
    } else {
      if (userId) {
        if (friendIds.length > 0) {
          var fl = friendIds.map(function(id) { return 'author = "' + id + '"'; }).join(" || ");
          filter += ' && (is_public = true || author = "' + userId + '" || ' + fl + ")";
        } else {
          filter += ' && (is_public = true || author = "' + userId + '")';
        }
      } else {
        filter += " && is_public = true";
      }
    }

    var all = $app.findRecordsByFilter("forum_threads", filter, sortStr, 1000, 0);
    var total = all.length;
    var start = page * perPage;
    var paged = all.slice(start, start + perPage);

    var threadIds = [];
    var i;
    for (i = 0; i < paged.length; i++) {
      threadIds.push(paged[i].get("id"));
    }

    var userVotes = [];
    if (auth && threadIds.length > 0) {
      try {
        var idsStr = threadIds.map(function(id) { return 'thread = "' + id + '"'; }).join(" || ");
        var vf = "(" + idsStr + ") && user = \"" + userId + "\"";
        var votes = $app.findRecordsByFilter("forum_votes", vf, "", 100, 0);
        for (i = 0; i < votes.length; i++) {
          userVotes.push({ thread: votes[i].get("thread"), type: votes[i].get("vote_type") });
        }
      } catch (err) {
        console.error("[forum] load votes:", err.toString());
      }
    }

    var authorIds = [];
    for (i = 0; i < paged.length; i++) {
      authorIds.push(paged[i].get("author"));
    }
    var authorNames = {};
    if (authorIds.length > 0) {
      try {
        var uids = authorIds.map(function(aid) { return 'id = "' + aid + '"'; }).join(" || ");
        var users = $app.findRecordsByFilter("_pb_users_auth_", uids, "", 100, 0);
        for (i = 0; i < users.length; i++) {
          authorNames[users[i].get("id")] = users[i].get("name") || "Usuario";
        }
      } catch (err) {}
    }

    var result = [];
    for (i = 0; i < paged.length; i++) {
      var r = paged[i];
      var rid = r.get("id");
      var authorId = r.get("author");
      var vote = null;
      for (var vi = 0; vi < userVotes.length; vi++) {
        if (userVotes[vi].thread === rid) { vote = userVotes[vi]; break; }
      }
      result.push({
        id: rid,
        title: r.get("title"),
        content: r.get("content"),
        author_id: authorId,
        author_name: authorNames[authorId] || "Usuario",
        is_public: r.get("is_public"),
        upvotes: r.get("upvotes") || 0,
        downvotes: r.get("downvotes") || 0,
        comment_count: r.get("comment_count") || 0,
        last_activity_at: r.get("last_activity_at") || r.get("created"),
        edited: r.get("edited") || false,
        deleted: r.get("deleted") || false,
        created: r.get("created"),
        user_vote: vote ? vote.type : null,
      });
    }

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

// ─── GET /api/forum/threads/{id} ─────────────────────────────────────────────
routerAdd("GET", "/api/forum/threads/{id}", function(e) {
  console.log("[forum] GET /api/forum/threads/{id} called");
  try {
    var id = e.request.pathValue("id");
    var auth = e.auth;
    var userId = auth ? auth.get("id") : "";
    var friendIds = [];
    if (auth) {
      try {
        var u = $app.findRecordById("users", userId);
        var rf = u.get("friends");
        friendIds = Array.isArray(rf) ? rf : [];
      } catch (err) {}
    }

    var thread = $app.findRecordById("forum_threads", id);
    if (!thread) return e.json(404, { code: 404, message: "Hilo no encontrado." });

    var isPublic = thread.get("is_public");
    var authorId = thread.get("author");

    if (!isPublic && authorId !== userId && friendIds.indexOf(authorId) === -1) {
      return e.json(403, { code: 403, message: "No tienes permiso para ver este hilo." });
    }

    var userVote = null;
    if (auth) {
      try {
        var uv = $app.findRecordsByFilter("forum_votes", 'thread = "' + id + '" && user = "' + userId + '"', "", 1, 0);
        if (uv.length > 0) userVote = uv[0].get("vote_type");
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
        var cids = [];
        var ci;
        for (ci = 0; ci < comments.length; ci++) {
          cids.push(comments[ci].get("id"));
        }
        if (cids.length > 0) {
          var cidsStr = cids.map(function(cid) { return 'comment = "' + cid + '"'; }).join(" || ");
          var cvf = "(" + cidsStr + ") && user = \"" + userId + "\"";
          var cvotes = $app.findRecordsByFilter("forum_votes", cvf, "", 100, 0);
          for (ci = 0; ci < cvotes.length; ci++) {
            commentVotes.push({ comment: cvotes[ci].get("comment"), type: cvotes[ci].get("vote_type") });
          }
        }
      } catch (err) {}
    }

    var allUserIds = [authorId];
    for (ci = 0; ci < comments.length; ci++) {
      allUserIds.push(comments[ci].get("author"));
      var cParent = comments[ci].get("parent");
      if (cParent) {
        try {
          var pc = $app.findRecordById("forum_comments", cParent);
          if (pc) allUserIds.push(pc.get("author"));
        } catch (err) {}
      }
    }

    var uniqueIds = [];
    var seenIds = {};
    for (ci = 0; ci < allUserIds.length; ci++) {
      if (allUserIds[ci] && !seenIds[allUserIds[ci]]) {
        seenIds[allUserIds[ci]] = true;
        uniqueIds.push(allUserIds[ci]);
      }
    }

    var authorNames = {};
    if (uniqueIds.length > 0) {
      try {
        var uids = uniqueIds.map(function(aid) { return 'id = "' + aid + '"'; }).join(" || ");
        var users = $app.findRecordsByFilter("_pb_users_auth_", uids, "", 100, 0);
        for (ci = 0; ci < users.length; ci++) {
          authorNames[users[ci].get("id")] = users[ci].get("name") || "Usuario";
        }
      } catch (err) {}
    }

    threadData.author_name = authorNames[authorId] || "Usuario";

    var commentData = [];
    for (ci = 0; ci < comments.length; ci++) {
      var c = comments[ci];
      var cId = c.get("id");
      var cAuthorId = c.get("author");
      var parentId = c.get("parent");
      var cvote = null;
      for (var cvi = 0; cvi < commentVotes.length; cvi++) {
        if (commentVotes[cvi].comment === cId) { cvote = commentVotes[cvi]; break; }
      }

      var parentAuthorName = null;
      if (parentId) {
        try {
          var pComment = $app.findRecordById("forum_comments", parentId);
          if (pComment) {
            var pAuthorId = pComment.get("author");
            parentAuthorName = authorNames[pAuthorId] || "Usuario";
          }
        } catch (err) {}
      }

      commentData.push({
        id: cId,
        thread: c.get("thread"),
        parent: parentId,
        author_id: cAuthorId,
        author_name: authorNames[cAuthorId] || "Usuario",
        parent_author_name: parentAuthorName,
        content: c.get("content"),
        upvotes: c.get("upvotes") || 0,
        downvotes: c.get("downvotes") || 0,
        depth: c.get("depth") || 0,
        edited: c.get("edited") || false,
        deleted: c.get("deleted") || false,
        created: c.get("created"),
        user_vote: cvote ? cvote.type : null,
      });
    }

    return e.json(200, { thread: threadData, comments: commentData });
  } catch (err) {
    console.error("[forum] GET /api/forum/threads/{id} error:", err.toString());
    return e.json(500, { code: 500, message: "Error al cargar el hilo." });
  }
});

// ─── POST /api/forum/threads ─────────────────────────────────────────────────
routerAdd("POST", "/api/forum/threads", function(e) {
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

// ─── PATCH /api/forum/threads/{id} ───────────────────────────────────────────
routerAdd("PATCH", "/api/forum/threads/{id}", function(e) {
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

// ─── POST /api/forum/threads/{id}/delete ─────────────────────────────────────
routerAdd("POST", "/api/forum/threads/{id}/delete", function(e) {
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

// ─── POST /api/forum/comments ────────────────────────────────────────────────
routerAdd("POST", "/api/forum/comments", function(e) {
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

// ─── PATCH /api/forum/comments/{id} ──────────────────────────────────────────
routerAdd("PATCH", "/api/forum/comments/{id}", function(e) {
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

// ─── POST /api/forum/comments/{id}/delete ────────────────────────────────────
routerAdd("POST", "/api/forum/comments/{id}/delete", function(e) {
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

// ─── POST /api/forum/vote ────────────────────────────────────────────────────
routerAdd("POST", "/api/forum/vote", function(e) {
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

    var curUp = target.get("upvotes") || 0;
    var curDown = target.get("downvotes") || 0;

    if (existing.length > 0) {
      var existingVote = existing[0];
      var existingType = existingVote.get("vote_type");

      if (existingType === voteType) {
        $app.delete(existingVote);
        if (voteType === "upvote") {
          target.set("upvotes", Math.max(0, curUp - 1));
        } else {
          target.set("downvotes", Math.max(0, curDown - 1));
        }
        $app.save(target);
        return e.json(200, { action: "removed", upvotes: target.get("upvotes"), downvotes: target.get("downvotes") });
      } else {
        existingVote.set("vote_type", voteType);
        $app.save(existingVote);
        if (voteType === "upvote") {
          target.set("upvotes", curUp + 1);
          target.set("downvotes", Math.max(0, curDown - 1));
        } else {
          target.set("upvotes", Math.max(0, curUp - 1));
          target.set("downvotes", curDown + 1);
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
        target.set("upvotes", curUp + 1);
      } else {
        target.set("downvotes", curDown + 1);
      }
      $app.save(target);
      return e.json(200, { action: "created", upvotes: target.get("upvotes"), downvotes: target.get("downvotes") });
    }
  } catch (err) {
    console.error("[forum] POST /api/forum/vote error:", err.toString());
    return e.json(500, { code: 500, message: "Error al procesar el voto." });
  }
});
