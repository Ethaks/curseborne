import * as models from "../data/item/_module.mjs";
import { CurseborneItem } from "./item.mjs";

declare global {
	type CurseborneBaseItem<
		Type extends string = "",
		Model extends foundry.abstract.TypeDataModel = foundry.abstract.TypeDataModel,
	> = CurseborneItem & { type: Type; system: Model };
	// Accursed
	type EdgeItem = CurseborneBaseItem<"edge", models.Edge>;
	type SkillItem = CurseborneBaseItem<"skill", models.Skill>;
	type LineageItem = CurseborneBaseItem<"lineage", models.Lineage>;
	type FamilyItem = CurseborneBaseItem<"family", models.Family>;
	type RoleItem = CurseborneBaseItem<"role", models.Role>;
	type SocialItem = CurseborneBaseItem<"social", models.Social>;
	type SpellItem = CurseborneBaseItem<"spell", models.Spell>;
	type EquipmentItem = CurseborneBaseItem<"equipment", models.Equipment>;
	type MotifItem = CurseborneBaseItem<"motif", models.Motif>;
	type TormentItem = CurseborneBaseItem<"torment", models.Torment>;

	// Adversaries
	type TemplateItem = CurseborneBaseItem<"template", models.AdversaryTemplate>;
	type QualityItem = CurseborneBaseItem<"quality", models.AdversaryQuality>;
	type DreadPowerItem = CurseborneBaseItem<"dread-power", models.DreadPower>;

	// Common
	type TrickItem = CurseborneBaseItem<"trick", models.Trick>;
}

declare module "./item.mjs" {}
