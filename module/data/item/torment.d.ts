import { tormentTypes } from "@config/item.mjs";

declare module "./torment.mjs" {
	interface Torment {
		type: keyof typeof tormentTypes;
		lineage: string | null;
	}
}
