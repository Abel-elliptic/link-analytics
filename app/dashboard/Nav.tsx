import Link from "next/link";
import type { Member } from "@/lib/members";
import { signOut } from "../login/actions";

export default function Nav({ me }: { me: Member }) {
  return (
    <header className="row between nav">
      <nav className="row">
        <Link href="/dashboard">短縮リンク</Link>
        <Link href="/dashboard/ga4">GA4連携</Link>
        {me.role === "admin" && <Link href="/dashboard/accounts">アカウント管理</Link>}
      </nav>
      <form action={signOut} className="row">
        <span className="sub">
          {me.email}（{me.role === "admin" ? "管理者" : "メンバー"}）
        </span>
        <button className="ghost small">ログアウト</button>
      </form>
    </header>
  );
}
