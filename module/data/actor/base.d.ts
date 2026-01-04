import { CoverType } from "@config/config";
import { DotsData } from "@models/fields/dots";

export {};

declare module "./base.mjs" {
	interface CurseborneActorBase {
		biography: HTMLString;
		defense: number;
		cover: DotsData & { current: CoverType };
		injuried: DotsData;
		armor: DotsData;
	}
}
