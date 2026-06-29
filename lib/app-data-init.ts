/** Side-effect: warm API cache as soon as the client bundle loads (before React mount). */
import { prefetchAppData } from "@/lib/prefetch-app-data";

if (typeof window !== "undefined") {
  prefetchAppData();
}
