/// <reference path="../pb_data/types.d.ts" />

cronAdd("cleanup-unverified", "*/30 * * * *", () => {
  const now = new Date().toISOString();

  const expiredVerification = $app.findRecordsByFilter(
    "verification_tokens",
    "expiresAt < {:now}",
    undefined,
    0,
    0,
    { now }
  );

  for (const tokenRecord of expiredVerification) {
    const userId = tokenRecord.get("userId");
    if (userId) {
      try {
        $app.delete($app.findRecordById("users", userId));
        console.log("[Cleanup] Eliminado usuario no verificado:", userId);
      } catch (err) {
        console.warn("[Cleanup] Error al eliminar usuario:", userId, err.message);
      }
    }
    $app.delete(tokenRecord);
  }

  if (expiredVerification.length > 0) {
    console.log("[Cleanup] Verificaciones expiradas eliminadas:", expiredVerification.length);
  }

  const expiredReset = $app.findRecordsByFilter(
    "password_reset_tokens",
    "expiresAt < {:now}",
    undefined,
    0,
    0,
    { now }
  );

  for (const tokenRecord of expiredReset) {
    $app.delete(tokenRecord);
  }

  if (expiredReset.length > 0) {
    console.log("[Cleanup] Tokens de restablecimiento expirados eliminados:", expiredReset.length);
  }
});
