/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/register", (e) => {
  const { email, password, passwordConfirm, name } = e.requestInfo().body;

  if (!email || !password || !passwordConfirm || !name) {
    return e.json(400, { code: 400, message: "Todos los campos son obligatorios." });
  }

  if (password.length < 8) {
    return e.json(400, { code: 400, message: "La contrasena debe tener al menos 8 caracteres." });
  }

  if (password !== passwordConfirm) {
    return e.json(400, { code: 400, message: "Las contrasenas no coinciden." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return e.json(400, { code: 400, message: "Formato de correo invalido." });
  }

  const existing = $app.findFirstRecordByData("users", "email", email);
  if (existing) {
    return e.json(400, { code: 400, message: "El correo ya esta registrado." });
  }

  const usersCol = $app.findCollectionByNameOrId("users");
  let record;
  try {
    record = new Record(usersCol);
    record.set("email", email);
    record.setPassword(password);
    record.set("name", name);
    record.set("role", "user");
    record.set("verified", false);
    $app.save(record);
  } catch (err) {
    return e.json(400, { code: 400, message: err.message || "Error al crear la cuenta." });
  }

  const token = $security.randomString(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const tokensCol = $app.findCollectionByNameOrId("verification_tokens");
  const tokenRecord = new Record(tokensCol);
  tokenRecord.set("userId", record.get("id"));
  tokenRecord.set("token", token);
  tokenRecord.set("expiresAt", expiresAt);
  $app.save(tokenRecord);

  const appUrl = $os.getenv("FRONTEND_URL") || "http://localhost:4200";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  console.log("[Register] Verification URL:", verifyUrl);

  try {
    const message = new MailerMessage({
      to: [{ address: email, name }],
      subject: "Verifica tu correo - FilmStack",
      html: `<p>Gracias por registrarte, ${name}!</p><p>Haz clic en el siguiente enlace para verificar tu correo:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    $app.newMailClient().send(message);
  } catch (mailErr) {
    console.warn("[Register] Error al enviar email:", mailErr.message);
  }

  return e.json(201, { message: "Cuenta creada. Revisa tu correo para verificar tu email." });
});
