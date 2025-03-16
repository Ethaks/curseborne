import * as models from "../data/item/_module.mjs";
import { CurseborneItem } from "./item.mjs";

declare global {
	type CurseborneBaseItem<
		Type extends string = "",
		Model extends foundry.abstract.TypeDataModel = foundry.abstract.TypeDataModel,
	> = CurseborneItem & { type: Type; system: Model };
	type LineageItem = CurseborneBaseItem<"lineage", models.Lineage>;
	type EdgesItem = CurseborneBaseItem<"edges", models.Edges>;
	type SkillItem = CurseborneBaseItem<"skill", models.Skill>;
}

declare module "./item.mjs" {}
