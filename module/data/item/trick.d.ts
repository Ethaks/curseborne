// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { DotsData } from "@models/fields/dots";

export {};

declare module "./trick.mjs" {
	interface Trick {
		type: keyof typeof curseborne.config.trickTypes;
		cost: DotsData & { type: keyof typeof curseborne.config.trickCostTypes };
		/** Whether the trick can be purchased multiple times in the same action. */
		multiple: boolean;
	}
}
