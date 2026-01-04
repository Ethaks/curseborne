import { Attribute, InjuryLevel } from "@config/config";
import { DotsData } from "@models/fields/dots";
import { Skill } from "@models/item/skill.mjs";

declare module "./accursed.mjs" {
	interface Accursed {
		attributes: Record<Attribute, DotsData>;

		injuries: DotsData & {
			level: null | InjuryLevel;
			dice: number;
		};

		aspirations: {
			short1: HTMLString;
			short2: HTMLString;
			long: HTMLString;
		};

		/** An ID reference to the major {@linkcode PathItem} document for this Accursed. */
		major: ID;

		entanglement: DotsData;

		curseDice: DotsData;

		xp: {
			current: number;
		};

		ui: {
			showToken: boolean;
			spellSorting: "grouped" | "flat";
		};

		initiative: {
			skill: Identifier;
			attribute: Attribute;
			/** The number of injury dice added due to the `skill` being used. */
			injuryDice: number;
			/** The total number of dice used to roll initiative. */
			dice: number;
		};

		skills: Record<Identifier, Skill>;
	}
}
