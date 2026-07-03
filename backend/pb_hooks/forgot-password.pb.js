/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/forgot-password", (e) => {
  const { email } = e.requestInfo().body;

  if (!email) {
    return e.json(400, { code: 400, message: "El correo es obligatorio." });
  }

  let user;
  try {
    user = $app.findFirstRecordByData("users", "email", email);
  } catch (_) {
    user = null;
  }

  if (!user) {
  return e.json(200, { message: "Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena." });
  }
  const token = $security.randomString(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const tokensCol = $app.findCollectionByNameOrId("password_reset_tokens");
  const tokenRecord = new Record(tokensCol);
  tokenRecord.set("userId", user.get("id"));
  tokenRecord.set("token", token);
  tokenRecord.set("expiresAt", expiresAt);
  $app.save(tokenRecord);

  const appUrl = $os.getenv("FRONTEND_URL") || "http://localhost:4200";
  console.log("[ForgotPassword] FRONTEND_URL:", $os.getenv("FRONTEND_URL"), "-> appUrl:", appUrl);
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    const message = new MailerMessage({
      to: [{ address: email }],
      subject: "Restablece tu contrasena - FilmStack",
      html: `<p>Haz clic en el siguiente enlace para restablecer tu contrasena:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
    $app.newMailClient().send(message);
  } catch (mailErr) {
    console.warn("[ForgotPassword] Error al enviar email:", mailErr.message);
  }

  return e.json(200, { message: "Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena." });
});
