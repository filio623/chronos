import { revalidatePath, revalidateTag } from "next/cache";
import { cachePlanFor, type CacheMutation } from "./cache-tags";

export function revalidateMutation(kind: CacheMutation): void {
  const plan = cachePlanFor(kind);
  for (const tag of plan.tags) {
    revalidateTag(tag, "max");
  }
  for (const path of plan.paths) {
    revalidatePath(path);
  }
}
