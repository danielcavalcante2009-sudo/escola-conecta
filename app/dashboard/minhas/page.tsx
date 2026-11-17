import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Shell from "@/components/Shell";
import MyPosts from "./MyPosts";

export default async function MinhasPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (profile.role !== "professor") redirect("/dashboard");

  return (
    <Shell profile={profile}>
      <MyPosts profile={profile} />
    </Shell>
  );
}
