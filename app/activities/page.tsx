export const dynamic = "force-dynamic";

import { dbAll } from "@/lib/db";
import type { WishlistItem } from "@/lib/types";
import ActivityList from "@/components/activities/ActivityList";
import AddActivityForm from "@/components/activities/AddActivityForm";
import BackfillAddressesButton from "@/components/activities/BackfillAddressesButton";

export default async function ActivitiesPage() {
  const items = await dbAll<WishlistItem>(
    "SELECT * FROM wishlist_items ORDER BY activity_date ASC, sort_order ASC, time_slot ASC, id ASC"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Activities</h2>
        <div className="flex items-center gap-3">
          <BackfillAddressesButton />
          <span className="text-sm text-gray-400">{items.length} total</span>
        </div>
      </div>
      <ActivityList items={items} />
      <AddActivityForm />
    </div>
  );
}
