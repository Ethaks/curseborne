// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { COMPLICATION } from "@config/dice.mjs";

declare module "./template.mjs" {
	interface AdversaryTemplate {
		/* Number of dice added to roll pools. */
		pools: {
			primary: number;
			secondary: number;
			desperation: number;
		};
		defense: number;
		integrity: number;
		injuries: number;
		armor: number;
		initiative: number;
		/** The severity of the complications imposed by this adversary's reactions. */
		complication: 0 | (typeof COMPLICATION)[keyof typeof COMPLICATION];
	}
}
