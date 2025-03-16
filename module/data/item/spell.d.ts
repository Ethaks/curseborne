export {};

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

		/** The spell's practice, akin to spell schools from other systems. */
		practice: string;

		/** Tags pointing to the spell's qualities, as well as other lineages that can access it. */
		attunements: Set<string>;
	}
}
