// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/* ---------------------------------------------------------------------------------------------- */
/*                                             Common                                             */
/* ---------------------------------------------------------------------------------------------- */

export const durations = {
	turn: { label: "CURSEBORNE.DURATION.Turn" },
	round: { label: "CURSEBORNE.DURATION.Round" },
	scene: { label: "CURSEBORNE.DURATION.Scene" },
	session: { label: "CURSEBORNE.DURATION.Session" },
	story: { label: "CURSEBORNE.DURATION.Story" },
	campaign: { label: "CURSEBORNE.DURATION.Campaign" },
};

/* ---------------------------------------------------------------------------------------------- */
/*                                             Tricks                                             */
/* ---------------------------------------------------------------------------------------------- */

export const trickCostTypes = /** @type {const} */ ({
	fixed: "CURSEBORNE.Item.Trick.FIELDS.cost.Fixed",
	variable: "CURSEBORNE.Item.Trick.FIELDS.cost.Variable",
});

export const trickCostFixedLabels = /** @type {const} */ ({
	1: "CURSEBORNE.Item.Trick.FIELDS.cost.Fixed.1",
	2: "CURSEBORNE.Item.Trick.FIELDS.cost.Fixed.2",
	3: "CURSEBORNE.Item.Trick.FIELDS.cost.Fixed.3",
});

export const trickTypes = /** @type {const} */ ({
	general: { label: "CURSEBORNE.Item.Trick.FIELDS.type.General" },
	curseDice: { label: "CURSEBORNE.Item.Trick.FIELDS.type.CurseDice" },

	combat: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Combat" },
	melee: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Melee" },
	ranged: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Ranged" },
	defense: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Defense" },

	influence: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Influence" },
	integrity: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Integrity" },
	investigation: { label: "CURSEBORNE.Item.Trick.FIELDS.type.Investigation" },
});

/* ---------------------------------------------------------------------------------------------- */
/*                                           Equipment                                            */
/* ---------------------------------------------------------------------------------------------- */

export const equipmentTypes = /** @type {const} */ ({
	weapon: {
		label: "CURSEBORNE.Item.Equipment.FIELDS.type.Weapon",
	},
	armor: {
		label: "CURSEBORNE.Item.Equipment.FIELDS.type.Armor",
	},
	tool: {
		label: "CURSEBORNE.Item.Equipment.FIELDS.type.Tool",
	},
});

/* ---------------------------------------------------------------------------------------------- */
/*                                             Skills                                             */
/* ---------------------------------------------------------------------------------------------- */

/**
 * A record of default skills to be added to new actors.
 * Entries can contain a `uuid` to reference an existing item; otherwise, the skill will be created with
 * the given data.
 * An `id` can be provided to determine the skill's `system.identifier`, defaulting back to the property key.
 *
 * @satisfies {Record<string, { uuid?: string, id?: string, name?: string }>}
 */
export const skills = {
	artistry: { id: "artistry", name: "CURSEBORNE.SKILLS.Artistry" },
	athletics: { id: "athletics", name: "CURSEBORNE.SKILLS.Athletics" },
	closeCombat: { id: "closeCombat", name: "CURSEBORNE.SKILLS.CloseCombat" },
	culture: { id: "culture", name: "CURSEBORNE.SKILLS.Culture" },
	empathy: { id: "empathy", name: "CURSEBORNE.SKILLS.Empathy" },
	enigmas: { id: "enigmas", name: "CURSEBORNE.SKILLS.Enigmas" },
	esoterica: { id: "esoterica", name: "CURSEBORNE.SKILLS.Esoterica" },
	larceny: { id: "larceny", name: "CURSEBORNE.SKILLS.Larceny" },
	leadership: { id: "leadership", name: "CURSEBORNE.SKILLS.Leadership" },
	medicine: { id: "medicine", name: "CURSEBORNE.SKILLS.Medicine" },
	persuasion: { id: "persuasion", name: "CURSEBORNE.SKILLS.Persuasion" },
	pilot: { id: "pilot", name: "CURSEBORNE.SKILLS.Pilot" },
	rangedCombat: { id: "rangedCombat", name: "CURSEBORNE.SKILLS.RangedCombat" },
	science: { id: "science", name: "CURSEBORNE.SKILLS.Science" },
	survival: { id: "survival", name: "CURSEBORNE.SKILLS.Survival" },
	technology: { id: "technology", name: "CURSEBORNE.SKILLS.Technology" },
};

/* ---------------------------------------------------------------------------------------------- */
/*                                             Spells                                             */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Spell Practices and their groups.
 *
 * @satisfies {Record<string, { label: string, groups: Record<string, { label: string }> }>}
 */
export const practices = /** @type {const} */ ({
	haunting: {
		label: "CURSEBORNE.PRACTICES.Haunting",
		groups: {
			emotionalManipulation: {
				label: "CURSEBORNE.PRACTICES.EmotionalManipulation",
			},
			incorporeality: { label: "CURSEBORNE.PRACTICES.Incorporeality" },
			metaphysics: { label: "CURSEBORNE.PRACTICES.Metaphysics" },
		},
	},
	predation: {
		label: "CURSEBORNE.PRACTICES.Predation",
		groups: {
			vitalForce: { label: "CURSEBORNE.PRACTICES.VitalForce" },
			ironEdict: { label: "CURSEBORNE.PRACTICES.IronEdict" },
			smokeAndShadow: { label: "CURSEBORNE.PRACTICES.SmokeAndShadow" },
		},
	},
	maelstrom: {
		label: "CURSEBORNE.PRACTICES.Maelstrom",
		groups: {
			mutableForm: { label: "CURSEBORNE.PRACTICES.MutableForm" },
			depthlessFury: { label: "CURSEBORNE.PRACTICES.DepthlessFury" },
			stranger: { label: "CURSEBORNE.PRACTICES.Stranger" },
		},
	},
	manifestation: {
		label: "CURSEBORNE.PRACTICES.Manifestation",
		groups: {
			mayhem: { label: "CURSEBORNE.PRACTICES.Mayhem" },
			summoning: { label: "CURSEBORNE.PRACTICES.Summoning" },
			physicalPerfection: { label: "CURSEBORNE.PRACTICES.PhysicalPerfection" },
		},
	},
	invocation: {
		label: "CURSEBORNE.PRACTICES.Invocation",
		groups: {
			acquisition: { label: "CURSEBORNE.PRACTICES.Acquisition" },
			biomancy: { label: "CURSEBORNE.PRACTICES.Biomancy" },
			consumingSiphon: { label: "CURSEBORNE.PRACTICES.ConsumingSiphon" },
			illusion: { label: "CURSEBORNE.PRACTICES.Illusion" },
			spiritualism: { label: "CURSEBORNE.PRACTICES.Spiritualism" },
			telelocation: { label: "CURSEBORNE.PRACTICES.Telelocation" },
			thaumaturgy: { label: "CURSEBORNE.PRACTICES.Thaumaturgy" },
		},
	},
});

export const spellCostTypes = {
	bleed: {
		label: "CURSEBORNE.Item.Spell.FIELDS.cost.Bleed",
		icon: "fa-solid fa-droplet",
	},
	hold: {
		label: "CURSEBORNE.Item.Spell.FIELDS.cost.Hold",
		icon: "fa-solid fa-hand-holding-magic",
	},
};
/**
 * A record of attunements that spells can have, as well as the type of target they might have.
 */
export const attunements = {
	elemental: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Elemental",
	},
	emotional: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Emotional",
	},
	ethereal: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Ethereal",
	},
	liminal: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Liminal",
	},
	lineage: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Lineage",
		targets: ["lineage", "family"],
	},
	physical: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Physical",
	},
	psychic: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Psychic",
	},
	support: {
		label: "CURSEBORNE.Item.Spell.ATTUNEMENTS.Support",
	},
};

export const tormentTypes = /** @type {const} */ ({
	personal: {
		label: "CURSEBORNE.Item.Torment.FIELDS.type.personal",
	},
	lineage: {
		label: "CURSEBORNE.Item.Torment.FIELDS.type.lineage",
	},
});

/* ---------------------------------------------------------------------------------------------- */
/*                                          Adversaries                                           */
/* ---------------------------------------------------------------------------------------------- */

export const dreadPowerTypes = /** @type {const} */ ({
	// Actions
	simple: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.simple",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Action",
	},
	reflexive: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.reflexive",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Action",
	},

	//Reactions
	complicationAny: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.complicationAny",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Reaction",
	},
	complicationAttack: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.complicationAttack",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Reaction",
	},
	complicationMelee: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.complicationMelee",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Reaction",
	},
	complicationGrapple: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.complicationGrapple",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Reaction",
	},
	complicationInfluence: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.complicationInfluence",
		group: "CURSEBORNE.Item.DreadPower.FIELDS.type.Reaction",
	},

	// Custom Text for anything not covered above
	custom: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.type.custom.label",
	},
});

export const dreadPowerInjuries = /** @type {const} */ ({
	full: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.injuries.Full",
	},
	half: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.injuries.Half",
	},
	one: {
		label: "CURSEBORNE.Item.DreadPower.FIELDS.injuries.One",
	},
});
