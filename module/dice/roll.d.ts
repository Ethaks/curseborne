// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneChatMessage } from "@documents/chat-message.mjs";
import { CurseborneRollDialog } from "../applications/dialogs/roll.mjs";
import { DIFFICULTY, ROLL_TYPE } from "../config/dice.mjs";
import { CurseborneRollContext, CurseborneRollContextData } from "./data.mjs";
import { CurseborneRoll } from "./roll.mjs";

export {};

declare module "./data.mjs" {
	interface CurseborneRollContextData {
		type: ROLL_TYPE;
		/** Data related to the sources contributing to the roll */
		sources: foundry.utils.Collection<string, DieSource>;

		/**
		 * The number of Curse Dice included in this roll.
		 */
		curseDice: number;

		/**
		 * The number of enhancements applied to this roll if there is at least one hit.
		 */
		enhancements: foundry.utils.Collection<string, RollModifier>;

		/** The number of Momentum enhancements applied to this roll if there is at least one hit. */
		momentum: number;

		/**
		 * The number of complications that can be bought off with hits.
		 */
		complications: foundry.utils.Collection<string, Complication>;

		/** The number of hits required for this roll to be a success. */
		difficulty: DIFFICULTY;

		/** Whether this roll was forced to be a success. */
		forcedSuccess?: boolean;

		/**
		 * What number counts as double success.
		 */
		double: number;

		/**
		 * The number of hits required for this roll to be a success.
		 */
		target: number;

		/**
		 * Whether this roll can be a wicked success or cruel failure.
		 */
		alteredOutcome: boolean;
	}

	export interface RollModifier {
		label: string;
		value: string;
		hint?: string;
		stacking?: boolean;
		source?: string;
	}

	export interface Complication extends RollModifier {}

	interface CurseborneRollContext extends CurseborneRollContextData {}

	export interface DieSource {
		id: string;
		type: "skill" | "attribute" | "";
		name: string;
		dice: number;
	}
}

declare module "./roll.mjs" {
	interface CurseborneRoll {
		constructor: typeof CurseborneRoll;
		data: CurseborneRollContext;
		dialog: CurseborneRollDialog;
	}

	export interface ActorRollOptions {
		data: CurseborneRollContext | CurseborneRollContextData;
		dialogOptions: Record<string, unknown>;
		skipDialog: boolean;
		chatMessage: boolean;
	}

	export interface ActorRollResult {
		roll: CurseborneRoll;
		message?: CurseborneChatMessage;
	}
}
