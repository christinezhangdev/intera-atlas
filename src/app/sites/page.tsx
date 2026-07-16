import { SiteExplorer } from "@/components/SiteExplorer";
import { getDirectorySites } from "@/lib/directory";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  return <SiteExplorer sites={await getDirectorySites()} />;
}
