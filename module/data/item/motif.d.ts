// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

export {};

declare module "./motif.mjs" {
	interface Motif {
		/** The identifier of the family with which this motif is associated. */
		family: string | null;
	}
}
