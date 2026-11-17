"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/server";

export const roleLabel: Record<string, string> = {
  aluno: "Aluno",
  professor: "Professor",
  coordenador: "Coordenador",
  diretor: "Diretor",
};

export const roleColor: Record<string, string> = {
  aluno: "bg-blue-100 text-blue-800",
  professor: "bg-amber-100 text-amber-800",
  coordenador: "bg-violet-100 text-violet-800",
  diretor: "bg-primary-100 text-primary-900",
};

function Avatar({ profile, size = 40 }: { profile: Profile; size?: number }) {
  if (profile.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name}
        width={size}
        height={size}
        className="rounded-full object-cover border-2 border-white shadow"
      />
    );
  }
  const initials = profile.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold border-2 border-white shadow"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

type Notif = {
  id: string;
  read: boolean;
  announcement_id: string;
  announcements: { title: string }[] | null;
};

export default function Shell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const supabase = createBrowserSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const nav =
    profile.role === "aluno"
      ? [{ href: "/dashboard", label: "Comunicados", icon: "📣" }]
      : profile.role === "professor"
        ? [
            { href: "/dashboard", label: "Comunicados", icon: "📣" },
            { href: "/dashboard/minhas", label: "Minhas publicações", icon: "📝" },
            ...(profile.can_publish
              ? [{ href: "/dashboard/novo", label: "Novo comunicado", icon: "➕" }]
              : []),
          ]
        : [
            { href: "/dashboard", label: "Comunicados", icon: "📣" },
            { href: "/dashboard/novo", label: "Novo comunicado", icon: "➕" },
            { href: "/admin", label: "Painel administrativo", icon: "⚙️" },
          ];

  useEffect(() => {
    loadNotifs();
    const channel = supabase
      .channel(`notif-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => loadNotifs()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadNotifs() {
    const { data } = await supabase
      .from("notifications")
      .select("id, read, announcement_id, announcements(title)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(15);
    setNotifs((data as unknown as Notif[]) ?? []);
  }

  async function openNotif(n: Notif) {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      loadNotifs();
    }
    setBellOpen(false);
    router.push("/dashboard");
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
    loadNotifs();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-primary-900 text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menu"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 hover:bg-white/10 transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              <span className="text-xl">🏫</span>
              <span className="hidden sm:inline">Escola Conecta</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notificações */}
            <div className="relative">
              <button
                aria-label="Notificações"
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-lg p-2 hover:bg-white/10 transition"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl bg-white text-gray-900 shadow-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-primary-50">
                    <span className="text-sm font-semibold">Notificações</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-primary-700 hover:underline">
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 && (
                      <p className="px-4 py-6 text-sm text-gray-500 text-center">Nenhuma notificação.</p>
                    )}
                    {notifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotif(n)}
                        className={`block w-full text-left px-4 py-3 text-sm border-b last:border-0 hover:bg-primary-50 transition ${n.read ? "" : "bg-primary-50/60 font-medium"}`}
                      >
                        <span className="mr-1.5">{n.read ? "📄" : "🔔"}</span>
                        {n.announcements?.[0]?.title ?? "Comunicado removido"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil */}
            <div className="flex items-center gap-2.5 rounded-full bg-white/10 py-1 pl-1 pr-3">
              <Avatar profile={profile} size={34} />
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold max-w-40 truncate">{profile.full_name}</p>
                <p className="text-[11px] text-primary-100">
                  {roleLabel[profile.role]}
                  {profile.role === "aluno" && profile.turma ? ` · Turma ${profile.turma}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Menu lateral (hambúrguer) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col">
            <div className="bg-primary-900 text-white px-5 py-5">
              <p className="text-lg font-bold">🏫 Escola Conecta</p>
              <p className="mt-1 text-xs text-primary-100">Comunicação escolar centralizada</p>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-b">
              <Avatar profile={profile} size={44} />
              <div className="leading-tight">
                <p className="text-sm font-semibold">{profile.full_name}</p>
                <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleColor[profile.role]}`}>
                  {roleLabel[profile.role]}
                </span>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-primary-100 text-primary-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t p-3">
              <button onClick={signOut} className="btn-danger w-full">
                Sair da conta
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
