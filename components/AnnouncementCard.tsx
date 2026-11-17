"use client";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: "geral" | "turma" | "professores" | "administrativo";
  turma: string | null;
  important: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  profiles: { full_name: string } | null;
};

export const categoryInfo: Record<string, { label: string; cls: string }> = {
  geral: { label: "Aviso geral", cls: "bg-primary-100 text-primary-900" },
  turma: { label: "Aviso de turma", cls: "bg-blue-100 text-blue-800" },
  professores: { label: "Aviso para professores", cls: "bg-amber-100 text-amber-800" },
  administrativo: { label: "Aviso administrativo", cls: "bg-violet-100 text-violet-800" },
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AnnouncementCard({
  a,
  actions,
  readCount,
}: {
  a: Announcement;
  actions?: React.ReactNode;
  readCount?: { read: number; total: number };
}) {
  const cat = categoryInfo[a.category];
  return (
    <article
      className={`card p-5 ${a.important ? "border-l-4 border-l-amber-400" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cat.cls}`}>
              {cat.label}
            </span>
            {a.turma && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">
                Turma {a.turma}
              </span>
            )}
            {a.important && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                ⚠️ Importante
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-bold text-gray-900">{a.title}</h3>
        </div>
        {actions}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{a.body}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-gray-500">
        <span>
          👤 <strong className="text-gray-700">{a.profiles?.full_name ?? "—"}</strong>
          {" · "}🕒 {fmt(a.created_at)}
          {a.updated_at !== a.created_at && " (editado)"}
        </span>
        {readCount && (
          <span className="font-medium text-primary-800">
            👁️ {readCount.read} leitura(s) confirmada(s)
          </span>
        )}
      </div>
    </article>
  );
}
