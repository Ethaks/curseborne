// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { DotsData } from "@models/fields/dots";

export {};
declare module "./social.mjs" {
	interface Social {
		type: "bond" | "contact";
		/** The UUID of an Actor document this bond represents. */
		uuid: string;

		bond: {
			/** The bond rating. */
			dots: DotsData;
			/** How often the bonds was used (this session). */
			uses: DotsData;
		};

		contact: {
			/** The contact rating. */
			dots: DotsData;
			/** How often the contact was invoked (this scene). */
			invokes: number;
			/** ID of the Path item granting this contact. */
			path: string;
			/** Tags associated with this contact. */
			tags: Set<string>;
		};
	}
}
