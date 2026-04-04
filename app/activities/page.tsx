export const dynamic = "force-dynamic";

import { dbAll } from "@/lib/db";
import type { WishlistItem } from "@/lib/types";
import ActivityList from "@/components/activities/ActivityList";
import AddActivityForm from "@/components/activities/AddActivityForm";

export default async function ActivitiesPage() {
  const items = await dbAll<WishlistItem>(
    "SELECT * FROM wishlist_items ORDER BY city ASC, created_at ASC"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Activities</h2>
        <span className="text-sm text-gray-400">{items.length} total</span>
      </div>
      <ActivityList items={items} />
      <AddActivityForm />
    </div>
  );
}
