// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import type { Practice, SpellGroup } from "@config/config";

declare module "./spell.mjs" {
	interface Spell {
		/** Whether the spell is a base spell, or advances another. */
		type: "base" | "advancement";

		/** The identifier of the spell advanced by this spell. */
		advances: string;

		/** Cost details for the spell. */
		cost: {
			type: keyof typeof curseborne.config.spellCostTypes;
			value: number;
		};

		practice: Practice;
		group: SpellGroup;

		/** Tags pointing to the spell's qualities, as well as other lineages that can access it. */
		attunements: Set<string>;
	}
}
