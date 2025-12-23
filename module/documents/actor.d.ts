// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneActor } from "./actor.mjs";

declare global {
	type CurseborneBaseActor<
		Type extends string = "",
		Model extends foundry.abstract.TypeDataModel = foundry.abstract.TypeDataModel,
	> = CurseborneActor & { type: Type; system: Model };
	type AccursedActor = CurseborneBaseActor<"accursed", foundry.abstract.TypeDataModel> & {
		itemTypes: {
			edge: EdgeItem[];
			skill: SkillItem[];
			lineage: LineageItem[];
			family: FamilyItem[];
			role: RoleItem[];
			social: SocialItem[];
			spell: SpellItem[];
			equipment: EquipmentItem[];
			motif: MotifItem[];
			torment: TormentItem[];
		};
	};
	type AdversaryActor = CurseborneBaseActor<"adversary", foundry.abstract.TypeDataModel> & {
		itemTypes: {
			template: TemplateItem[];
			quality: QualityItem[];
			dreadPower: DreadPowerItem[];
		};
	};
}
