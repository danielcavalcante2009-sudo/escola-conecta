import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import EditForm from "./EditForm";

export default async function EditarPage({ params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/");
  const isStaff = profile.role === "coordenador" || profile.role === "diretor";
  if (!isStaff && !profile.can_publish) redirect("/dashboard");

  return (
    <Shell profile={profile}>
      <EditForm id={params.id} profile={profile} />
    </Shell>
  );
}
