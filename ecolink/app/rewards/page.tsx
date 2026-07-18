import { RewardsPage } from "@/features/rewards/components/rewards-page";
import { getRewardsPageData } from "@/features/rewards/data/rewards-page-data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RewardsRoutePage() {
  const user = await requireUser();
  const data = await getRewardsPageData(user);

  return <RewardsPage initialData={data} />;
}
