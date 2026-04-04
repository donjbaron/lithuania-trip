export const dynamic = "force-dynamic";

import { dbAll } from "@/lib/db";
import { type Restaurant } from "@/lib/types";
import RestaurantList from "@/components/restaurants/RestaurantList";
import AddRestaurantForm from "@/components/restaurants/AddRestaurantForm";

export default async function RestaurantsPage() {
  const items = await dbAll<Restaurant>(
    "SELECT * FROM restaurants ORDER BY city ASC, meal_type ASC, name ASC"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Restaurants</h2>
        <span className="text-sm text-gray-400">{items.length} saved</span>
      </div>
      <RestaurantList items={items} />
      <AddRestaurantForm />
    </div>
  );
}
