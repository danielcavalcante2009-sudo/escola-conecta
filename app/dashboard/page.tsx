import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import Feed from "./Feed";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (!profile.active) redirect("/");

  return (
    <Shell profile={profile}>
      <Feed profile={profile} />
    </Shell>
  );
}
