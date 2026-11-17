"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { roleLabel, roleColor } from "@/components/Shell";
import type { Profile } from "@/lib/supabase/server";

const turmas = ["1A", "1B", "2A", "2B", "3A", "3B"];

type Log = { id: string; actor_name: string | null; action: string; details: string | null; created_at: string };

export default function AdminPanel({ profile }: { profile: Profile }) {
  const [turmaCounts, setTurmaCounts] = useState<Record<string, number>>({});
  const supabase = createBrowserSupabase();
  const isDirector = profile.role === "diretor";

  const [tab, setTab] = useState<string>("usuarios");

  // ---- dados ----
  const [users, setUsers] = useState<Profile[]>([]);
  type PostRow = { id: string; title: string; category: string; turma: string | null; created_at: string; profiles: { full_name: string } | null };
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [reads, setReads] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<Log[]>([]);
  const [countsByTurma, setCountsByTurma] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("todos");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: us }, { data: ps }, { data: ls }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("announcements").select("*, profiles!announcements_author_id_fkey(full_name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("announcement_reads").select("announcement_id"),
    ]);
    setUsers((us as Profile[]) ?? []);
    setPosts((ps as PostRow[]) ?? []);
    setLogs((ls as Log[]) ?? []);
    const rc: Record<string, number> = {};
    for (const r of rs ?? []) rc[r.announcement_id] = (rc[r.announcement_id] ?? 0) + 1;
    setReads(rc);
    // totais-alvo por comunicado
    const tc: Record<string, number> = {};
    for (const a of (ps as PostRow[]) ?? []) {
      if (a.category === "geral") tc[a.id] = us?.filter((u) => u.active).length ?? 0;
      else if (a.category === "professores") tc[a.id] = us?.filter((u) => u.role === "professor" && u.active).length ?? 0;
      else if (a.category === "administrativo") tc[a.id] = us?.filter((u) => ["coordenador", "diretor"].includes(u.role) && u.active).length ?? 0;
      else tc[a.id] = us?.filter((u) => u.role === "aluno" && u.turma === a.turma && u.active).length ?? 0;
    }
    setCountsByTurma(tc);
    const byT: Record<string, number> = {};
    for (const u of us ?? []) if (u.turma) byT[u.turma] = (byT[u.turma] ?? 0) + 1;
    setTurmaCounts(byT);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ---- formulário de cadastro ----
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", role: "aluno" as Profile["role"],
    matricula: "", turma: turmas[0], can_publish: false,
  });
  const [creating, setCreating] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) return flash("err", data.error);
    flash("ok", `✅ ${form.full_name} cadastrado(a) com sucesso.`);
    setForm({ full_name: "", email: "", password: "", role: form.role, matricula: "", turma: turmas[0], can_publish: false });
    reload();
  }

  async function patchUser(id: string, updates: Record<string, unknown>, okMsg: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) return flash("err", data.error);
    flash("ok", okMsg);
    reload();
  }

  const filtered = users.filter((u) => filterRole === "todos" || u.role === filterRole);

  const tabs = [
    { id: "usuarios", label: "👥 Usuários" },
    { id: "turmas", label: "🎓 Turmas" },
    { id: "comunicados", label: "📣 Comunicados" },
    ...(isDirector ? [{ id: "permissoes", label: "🔑 Permissões" }] : []),
    { id: "atividade", label: "📋 Atividade" },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">⚙️ Painel administrativo</h1>
        <p className="text-sm text-gray-500">
          {isDirector
            ? "Controle total: usuários, turmas, comunicados, permissões e atividades."
            : "Gerencie alunos, professores, turmas e comunicados."}
        </p>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          msg.type === "ok" ? "border-primary-200 bg-primary-50 text-primary-900" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
              tab === t.id ? "border-primary-800 bg-primary-800 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------- USUÁRIOS ---------- */}
      {tab === "usuarios" && (
        <div className="grid gap-5 lg:grid-cols-5">
          <form onSubmit={createUser} className="card space-y-4 p-5 lg:col-span-2 h-fit">
            <h2 className="font-bold text-gray-900">Cadastrar novo usuário</h2>
            <div>
              <label className="label">Função</label>
              <select className="input" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Profile["role"] })}>
                {(isDirector ? ["aluno", "professor", "coordenador", "diretor"] : ["aluno", "professor"]).map((r) => (
                  <option key={r} value={r}>{roleLabel[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nome completo</label>
              <input required className="input" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">E-mail {form.role === "aluno" ? "" : "institucional"}</label>
              <input required type="email" className="input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Senha inicial (mín. 6 caracteres)</label>
              <input required minLength={6} className="input" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {form.role === "aluno" && (
              <>
                <div>
                  <label className="label">Matrícula (ID único)</label>
                  <input required className="input" value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })} placeholder="Ex.: 2024015" />
                </div>
                <div>
                  <label className="label">Turma</label>
                  <select className="input" value={form.turma}
                    onChange={(e) => setForm({ ...form, turma: e.target.value })}>
                    {turmas.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}
            {form.role === "professor" && (
              <label className={`flex items-center gap-2 text-sm ${isDirector ? "text-gray-700" : "text-gray-400"}`}>
                <input type="checkbox" disabled={!isDirector} checked={form.can_publish}
                  onChange={(e) => setForm({ ...form, can_publish: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300" />
                {isDirector ? "Autorizar publicação de comunicados" : "Permissão de publicação é exclusiva do diretor"}
              </label>
            )}
            <button type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? "Cadastrando..." : "Cadastrar usuário"}
            </button>
          </form>

          <div className="space-y-3 lg:col-span-3">
            <div className="flex flex-wrap gap-2">
              {["todos", "aluno", "professor", "coordenador", "diretor"].map((r) => (
                <button key={r} onClick={() => setFilterRole(r)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    filterRole === r ? "border-primary-800 bg-primary-800 text-white" : "border-gray-200 bg-white"
                  }`}>
                  {r === "todos" ? "Todos" : roleLabel[r]}
                </button>
              ))}
            </div>
            {loading && <p className="text-sm text-gray-500">Carregando...</p>}
            <div className="space-y-2">
              {filtered.map((u) => (
                <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleColor[u.role]}`}>
                        {roleLabel[u.role]}
                      </span>
                      {u.turma && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold">Turma {u.turma}</span>}
                      {u.matricula && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px]">Mat. {u.matricula}</span>}
                      {u.role === "professor" && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.can_publish ? "bg-primary-100 text-primary-900" : "bg-gray-100 text-gray-500"}`}>
                          {u.can_publish ? "✅ Pode publicar" : "🔒 Sem permissão"}
                        </span>
                      )}
                      {!u.active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Desativado</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {isDirector && u.role === "professor" && (
                      <button
                        onClick={() => patchUser(u.id, { can_publish: !u.can_publish },
                          u.can_publish ? "Permissão de publicação retirada." : "Professor autorizado a publicar.")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${u.can_publish ? "btn-danger" : "btn-secondary"}`}>
                        {u.can_publish ? "Retirar publicação" : "Autorizar publicação"}
                      </button>
                    )}
                    {u.role === "aluno" && (
                      <select
                        value={u.turma ?? ""}
                        onChange={(e) => patchUser(u.id, { turma: e.target.value }, `Turma atualizada para ${e.target.value}.`)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs">
                        <option value="">Sem turma</option>
                        {turmas.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => {
                        const nova = prompt("Nova senha (mín. 6 caracteres):");
                        if (nova) patchUser(u.id, { new_password: nova }, "Senha redefinida.");
                      }}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      Redefinir senha
                    </button>
                    <button
                      onClick={() => patchUser(u.id, { active: !u.active },
                        u.active ? "Usuário desativado." : "Usuário reativado.")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${u.active ? "btn-danger" : "btn-secondary"}`}>
                      {u.active ? "Desativar" : "Reativar"}
                    </button>
                    {isDirector && u.id !== profile.id && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Excluir definitivamente ${u.full_name}?`)) return;
                          const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
                          const d = await res.json();
                          if (!res.ok) return flash("err", d.error);
                          flash("ok", "Usuário excluído.");
                          reload();
                        }}
                        className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100">
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- TURMAS ---------- */}
      {tab === "turmas" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => {
            const alunos = users.filter((u) => u.role === "aluno" && u.turma === t);
            return (
              <div key={t} className="card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-primary-900">Turma {t}</h2>
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-900">
                    {alunos.length} aluno(s)
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {alunos.length === 0 && <li className="text-xs text-gray-400">Nenhum aluno vinculado.</li>}
                  {alunos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{a.full_name}</span>
                      <button
                        onClick={() => patchUser(a.id, { turma: null }, `${a.full_name} removido(a) da turma.`)}
                        className="text-xs font-semibold text-red-600 hover:underline">
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- COMUNICADOS ---------- */}
      {tab === "comunicados" && (
        <div className="space-y-3">
          {loading && <p className="text-sm text-gray-500">Carregando...</p>}
          {!loading && posts.length === 0 && <div className="card p-8 text-center text-sm text-gray-500">Nenhum comunicado publicado.</div>}
          {posts.map((p) => {
            const readsN = reads[p.id] ?? 0;
            const total = countsByTurma[p.id] ?? 0;
            return (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{p.title}</p>
                  <p className="text-xs text-gray-500">
                    {p.profiles?.full_name ?? "—"} · {new Date(p.created_at).toLocaleString("pt-BR")} · cat. {p.category}{p.turma ? ` ${p.turma}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-medium text-primary-800">
                    👁️ {readsN} de {total} confirmaram leitura {total > 0 && `(${Math.round((readsN / Math.max(total, 1)) * 100)}%)`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <a href={`/dashboard/editar/${p.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold hover:bg-gray-50">Editar</a>
                  <button
                    onClick={async () => {
                      if (!confirm("Excluir este comunicado?")) return;
                      const res = await fetch(`/api/announcements/${p.id}`, { method: "DELETE" });
                      if (res.ok) { flash("ok", "Comunicado excluído."); reload(); }
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- PERMISSÕES (DIRETOR) ---------- */}
      {tab === "permissoes" && isDirector && (
        <div className="space-y-3">
          <div className="card p-4 text-sm text-gray-700">
            🔑 Defina quais professores podem publicar comunicados. Sem autorização ativa, o sistema
            bloqueia a publicação do professor no servidor — não apenas na interface.
          </div>
          {users.filter((u) => u.role === "professor").map((u) => (
            <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-bold">{u.full_name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <button
                onClick={() => patchUser(u.id, { can_publish: !u.can_publish },
                  u.can_publish ? "Permissão retirada." : "Autorização concedida.")}
                className={u.can_publish ? "btn-danger" : "btn-primary"}>
                {u.can_publish ? "✅ Autorizado — retirar" : "🚫 Bloqueado — autorizar"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ---------- ATIVIDADE ---------- */}
      {tab === "atividade" && (
        <div className="card divide-y p-0">
          {logs.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Nenhuma atividade registrada.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-sm"><strong>{l.actor_name ?? "—"}</strong> — {l.action}</p>
                <p className="text-xs text-gray-600">{l.details}</p>
              </div>
              <span className="whitespace-nowrap text-[11px] text-gray-400">
                {new Date(l.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
