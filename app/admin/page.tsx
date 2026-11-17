import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (!["coordenador", "diretor"].includes(profile.role)) redirect("/dashboard");

  return (
    <Shell profile={profile}>
      <AdminPanel profile={profile} />
    </Shell>
  );
}
