// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/**
 * @enum {typeof DIFFICULTY[keyof typeof DIFFICULTY]}
 */
export const DIFFICULTY = /** @type {const} */ ({
	ROUTINE: 0,
	STRAIGHTFORWARD: 1,
	MODERATE: 2,
	CHALLENGING: 3,
	EXTREME: 4,
	NEAR_IMPOSSIBLE: 5,
});

export const difficulties = /** @type {const} */ ({
	[DIFFICULTY.ROUTINE]: { label: "CURSEBORNE.DICE.DIFFICULTY.Routine" },
	[DIFFICULTY.STRAIGHTFORWARD]: {
		label: "CURSEBORNE.DICE.DIFFICULTY.Straightforward",
	},
	[DIFFICULTY.MODERATE]: { label: "CURSEBORNE.DICE.DIFFICULTY.Moderate" },
	[DIFFICULTY.CHALLENGING]: { label: "CURSEBORNE.DICE.DIFFICULTY.Challenging" },
	[DIFFICULTY.EXTREME]: { label: "CURSEBORNE.DICE.DIFFICULTY.Extreme" },
	[DIFFICULTY.NEAR_IMPOSSIBLE]: {
		label: "CURSEBORNE.DICE.DIFFICULTY.NearImpossible",
	},
});

/** @enum {typeof ROLL_TYPE[keyof typeof ROLL_TYPE]} */
export const ROLL_TYPE = /** @type {const} */ ({
	GENERAL: "general",
	DEFENSE: "defense",
	INITIATIVE: "initiative",
	POOL: "pool",
	CONTACT_INVOKE: "contactInvoke",
	CONTACT_SELF: "contactSelf",
});

export const COMPLICATION = /** @type {const} */ ({
	MINOR: 1,
	MODERATE: 2,
	MAJOR: 3,
});
export const complications = /** @type {const} */ ({
	[COMPLICATION.MINOR]: "CURSEBORNE.DICE.COMPLICATION.Minor",
	[COMPLICATION.MODERATE]: "CURSEBORNE.DICE.COMPLICATION.Moderate",
	[COMPLICATION.MAJOR]: "CURSEBORNE.DICE.COMPLICATION.Major",
});
