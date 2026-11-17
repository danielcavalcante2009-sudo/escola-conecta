import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import NewAnnouncement from "./NovoForm";

export default async function NovoPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  const allowed =
    profile.role === "coordenador" ||
    profile.role === "diretor" ||
    (profile.role === "professor" && profile.can_publish);
  if (!allowed) redirect("/dashboard");

  return (
    <Shell profile={profile}>
      <NewAnnouncement profile={profile} />
    </Shell>
  );
}
