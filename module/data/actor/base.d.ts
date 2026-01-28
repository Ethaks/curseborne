// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CoverType } from "@config/config";
import { DotsData } from "@models/fields/dots";

export {};

declare module "./base.mjs" {
	interface CurseborneActorBase {
		biography: HTMLString;
		defense: number;
		integrity: number;
		cover: DotsData & { current: CoverType };
		injuried: DotsData;
		armor: DotsData;
	}
}
