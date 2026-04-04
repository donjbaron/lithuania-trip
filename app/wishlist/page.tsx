export const dynamic = "force-dynamic";

import { dbAll } from "@/lib/db";
import { type WishlistItem } from "@/lib/types";
import WishlistClient from "@/components/wishlist/WishlistClient";

export default async function WishlistPage() {
  const items = await dbAll<WishlistItem>(
    "SELECT * FROM wishlist_items ORDER BY is_done ASC, created_at ASC"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Wishlist</h2>
        <span className="text-sm text-gray-400">
          {items.filter((i) => !i.is_done).length} to do ·{" "}
          {items.filter((i) => i.is_done).length} done
        </span>
      </div>
      <WishlistClient items={items} />
    </div>
  );
}
