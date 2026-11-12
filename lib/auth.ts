/** 環境変数 ALLOWED_EMAIL = 初期管理者。初回ログイン時に admin として登録され、削除できない。 */
export function isBootstrapAdmin(email: string | null | undefined): boolean {
  const allowed = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
  return !!allowed && (email ?? "").trim().toLowerCase() === allowed;
}
