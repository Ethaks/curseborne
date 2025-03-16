export const attributeGroups = {
	mental: {
		label: "CURSEBORNE.ATTRIBUTE_GROUPS.Mental",
	},
	physical: {
		label: "CURSEBORNE.ATTRIBUTE_GROUPS.Physical",
	},
	social: {
		label: "CURSEBORNE.ATTRIBUTE_GROUPS.Social",
	},
};

export const attributes = {
	intellect: {
		label: "CURSEBORNE.ATTRIBUTES.Intellect",
		group: "mental",
	},
	cunning: {
		label: "CURSEBORNE.ATTRIBUTES.Cunning",
		group: "mental",
	},
	resolve: {
		label: "CURSEBORNE.ATTRIBUTES.Resolve",
		group: "mental",
	},
	might: {
		label: "CURSEBORNE.ATTRIBUTES.Might",
		group: "physical",
	},
	dexterity: {
		label: "CURSEBORNE.ATTRIBUTES.Dexterity",
		group: "physical",
	},
	stamina: {
		label: "CURSEBORNE.ATTRIBUTES.Stamina",
		group: "physical",
	},
	presence: {
		label: "CURSEBORNE.ATTRIBUTES.Presence",
		group: "social",
	},
	manipulation: {
		label: "CURSEBORNE.ATTRIBUTES.Manipulation",
		group: "social",
	},
	composure: {
		label: "CURSEBORNE.ATTRIBUTES.Composure",
		group: "social",
	},
};

/* -------------------------------------------- */
/*                 Injuries                     */
/* -------------------------------------------- */
export const injuryLevels = /** @type {const} */ ({
	bloodied: {
		size: 2,
		dice: 1,
		label: "CURSEBORNE.INJURIES.Bloodied",
		icon: "fa-solid fa-droplet",
	},
	wounded: {
		size: 2,
		dice: 2,
		label: "CURSEBORNE.INJURIES.Wounded",
		icon: "fa-solid fa-user-injured",
	},
	maimed: {
		size: 2,
		dice: 2,
		label: "CURSEBORNE.INJURIES.Maimed",
		icon: "fa-solid fa-face-head-bandage",
	},
	nearDeath: {
		size: 1,
		dice: 3,
		label: "CURSEBORNE.INJURIES.NearDeath",
		icon: "fa-solid fa-skull",
	},
});

export const coverTypes = /** @type {const} */ ({
	light: {
		label: "CURSEBORNE.COVER.Light",
		icon: "fa-solid fa-shield-halved",
		damage: 4,
	},
	heavy: {
		label: "CURSEBORNE.COVER.Heavy",
		icon: "fa-solid fa-shield",
		damage: 10,
	},
	full: {
		label: "CURSEBORNE.COVER.Full",
		icon: "fa-solid fa-block-brick",
		damage: 10,
	},
});

/* -------------------------------------------- */
/*                  Adversaries                 */
/* -------------------------------------------- */

export const adversaryTemplates = {
	shiver: {},
	fright: {},
	terror: {},
	nightmare: {},
	shatteredSpace: {},
};
