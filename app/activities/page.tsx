export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import type { WishlistItem } from "@/lib/types";
import ActivityList from "@/components/activities/ActivityList";
import AddActivityForm from "@/components/activities/AddActivityForm";

function getActivities(): WishlistItem[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM wishlist_items ORDER BY city ASC, created_at ASC")
    .all() as WishlistItem[];
}

export default function ActivitiesPage() {
  const items = getActivities();

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
