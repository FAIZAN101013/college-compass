import { redirect } from "next/navigation";

/**
 * The root route.
 *
 * College Compass is a discovery tool, and discovery starts at the listing.
 * Rather than build a marketing landing page that every visitor would click
 * straight through, "/" sends people to the thing they came for.
 *
 * redirect() here is a server-side 307, so the browser never renders an
 * intermediate page and there is no flash of empty content.
 */
export default function HomePage() {
  redirect("/colleges");
}
