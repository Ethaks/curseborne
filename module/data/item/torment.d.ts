// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { tormentTypes } from "@config/item.mjs";

declare module "./torment.mjs" {
	interface Torment {
		type: keyof typeof tormentTypes;
		lineage: string | null;
	}
}
