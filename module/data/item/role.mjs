// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { Path } from "./path.mjs";

export class Role extends Path {
	/** @inheritDoc */
	static metadata = Object.freeze({ ...super.metadata, type: "role" });
}
