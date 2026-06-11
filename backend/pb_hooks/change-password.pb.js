/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/change-password", (e) => {
  const auth = e.auth;
  if (!auth) {
    return e.json(401, { code: 401, message: "No autenticado." });
  }

  const { oldPassword, newPassword, newPasswordConfirm } = e.requestInfo().body;

  if (!oldPassword || !newPassword || !newPasswordConfirm) {
    return e.json(400, { code: 400, message: "Todos los campos son obligatorios." });
  }

  if (newPassword.length < 8) {
    return e.json(400, { code: 400, message: "La contrasena debe tener al menos 8 caracteres." });
  }

  if (newPassword !== newPasswordConfirm) {
    return e.json(400, { code: 400, message: "Las contrasenas no coinciden." });
  }

  if (!auth.validatePassword(oldPassword)) {
    return e.json(400, { code: 400, message: "La contrasena actual es incorrecta." });
  }

  try {
    auth.setPassword(newPassword);
    $app.save(auth);
    return e.json(200, { message: "Contrasena cambiada exitosamente." });
  } catch (err) {
    return e.json(400, { code: 400, message: err.message || "Error al cambiar la contrasena." });
  }
});
