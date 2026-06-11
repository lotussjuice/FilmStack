/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/reset-password", (e) => {
  const { token, newPassword, newPasswordConfirm } = e.requestInfo().body;

  if (!token || !newPassword || !newPasswordConfirm) {
    return e.json(400, { code: 400, message: "Todos los campos son obligatorios." });
  }

  if (newPassword.length < 8) {
    return e.json(400, { code: 400, message: "La contrasena debe tener al menos 8 caracteres." });
  }

  if (newPassword !== newPasswordConfirm) {
    return e.json(400, { code: 400, message: "Las contrasenas no coinciden." });
  }

  const tokenRecord = $app.findFirstRecordByData("password_reset_tokens", "token", token);

  if (!tokenRecord) {
    return e.json(400, { code: 400, message: "Token invalido o ya fue usado." });
  }
  const expiresAt = new Date(tokenRecord.get("expiresAt") + "Z");
  if (expiresAt < new Date()) {
    $app.delete(tokenRecord);
    return e.json(400, { code: 400, message: "El token ha expirado. Solicita un nuevo restablecimiento." });
  }

  const userId = tokenRecord.get("userId");
  if (!userId) {
    $app.delete(tokenRecord);
    return e.json(400, { code: 400, message: "Token invalido." });
  }

  try {
    const userRecord = $app.findRecordById("users", userId);
    userRecord.setPassword(newPassword);
    $app.save(userRecord);
    $app.delete(tokenRecord);
    return e.json(200, { message: "Contrasena restablecida exitosamente." });
  } catch (err) {
    return e.json(400, { code: 400, message: "Error al restablecer la contrasena." });
  }
});
