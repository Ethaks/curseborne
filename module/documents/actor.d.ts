// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { Accursed } from "@models/actor/accursed.mjs";
import { CurseborneActor } from "./actor.mjs";
import { Adversary } from "@models/actor/adversary.mjs";

declare global {
	type CurseborneBaseActor<
		Type extends string = "",
		Model extends foundry.abstract.TypeDataModel = foundry.abstract.TypeDataModel,
	> = CurseborneActor & { type: Type; system: Model };
	type AccursedActor = CurseborneBaseActor<"accursed", Accursed> & {
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
	type AdversaryActor = CurseborneBaseActor<"adversary", Adversary> & {
		itemTypes: {
			template: TemplateItem[];
			quality: QualityItem[];
			dreadPower: DreadPowerItem[];
		};
	};
}
