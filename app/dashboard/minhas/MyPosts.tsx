"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import AnnouncementCard, { type Announcement } from "@/components/AnnouncementCard";
import Link from "next/link";
import type { Profile } from "@/lib/supabase/server";

export default function MyPosts({ profile }: { profile: Profile }) {
  const supabase = createBrowserSupabase();
  const [items, setItems] = useState<Announcement[]>([]);
  const [counts, setCounts] = useState<Record<string, { read: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: anns } = await supabase
        .from("announcements")
        .select("*, profiles!announcements_author_id_fkey(full_name)")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false });
      const list = (anns as Announcement[]) ?? [];
      setItems(list);

      // Público-alvo de cada comunicado + leituras
      const nextCounts: Record<string, { read: number; total: number }> = {};
      for (const a of list) {
        const { count: total } =
          a.category === "geral"
            ? await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("active", true)
            : a.category === "professores"
              ? await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "professor").eq("active", true)
              : await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "aluno").eq("turma", a.turma ?? "");
        const { count: read } = await supabase
          .from("announcement_reads")
          .select("*", { count: "exact", head: true })
          .eq("announcement_id", a.id);
        nextCounts[a.id] = { read: read ?? 0, total: total ?? 0 };
      }
      setCounts(nextCounts);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">📝 Minhas publicações</h1>
        {profile.can_publish && (
          <Link href="/dashboard/novo" className="btn-primary text-xs">➕ Novo comunicado</Link>
        )}
      </div>
      {!profile.can_publish && (
        <div className="card border-l-4 border-l-amber-400 p-4 text-sm text-gray-700">
          ⚠️ Sua autorização de publicação foi retirada pelo diretor. Suas publicações anteriores
          continuam visíveis para o público, mas você não pode criar novas até receber autorização novamente.
        </div>
      )}
      {loading && <p className="text-sm text-gray-500">Carregando...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-10 text-center text-sm text-gray-500">Você ainda não publicou comunicados.</div>
      )}
      <div className="space-y-4">
        {items.map((a) => {
          const c = counts[a.id];
          const pct = c && c.total > 0 ? Math.round((c.read / c.total) * 100) : 0;
          return (
            <div key={a.id}>
              <AnnouncementCard
                a={a}
                readCount={c}
                actions={
                  <div className="flex gap-1.5">
                    <Link href={`/dashboard/editar/${a.id}`}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      Editar
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm("Excluir este comunicado?")) return;
                        const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
                        if (res.ok) setItems((prev) => prev.filter((x) => x.id !== a.id));
                      }}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                      Excluir
                    </button>
                  </div>
                }
              />
              {c && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
                  </div>
                  {c.read}/{c.total} confirmaram leitura ({pct}%)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
