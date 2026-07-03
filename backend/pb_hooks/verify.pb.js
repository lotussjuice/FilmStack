/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/verify-email", (e) => {
  const token = e.requestInfo().query.token;

  if (!token) {
    return e.json(400, { code: 400, message: "Token requerido." });
  }

  let tokenRecord;
  try {
    tokenRecord = $app.findFirstRecordByData("verification_tokens", "token", token);
  } catch (_) {
    tokenRecord = null;
  }

  if (!tokenRecord) {
    return e.json(400, { code: 400, message: "Token invalido o ya fue usado." });
  }
  const expiresAt = new Date(tokenRecord.get("expiresAt") + "Z");
  if (expiresAt < new Date()) {
    const userId = tokenRecord.get("userId");
    $app.delete(tokenRecord);
    if (userId) {
      try {
        $app.delete($app.findRecordById("users", userId));
      } catch (_) {}
    }
    return e.json(400, { code: 400, message: "El token ha expirado. Vuelve a registrarte." });
  }

  const userId = tokenRecord.get("userId");
  if (!userId) {
    $app.delete(tokenRecord);
    return e.json(400, { code: 400, message: "Token invalido." });
  }

  try {
    const userRecord = $app.findRecordById("users", userId);
    userRecord.set("verified", true);
    $app.save(userRecord);
    $app.delete(tokenRecord);
    return e.json(200, { message: "Correo verificado exitosamente." });
  } catch (err) {
    return e.json(400, { code: 400, message: "Error al verificar el usuario." });
  }
});
