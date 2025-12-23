// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

export {};
declare module "./utils.mjs" {
	interface RandomIDOptions {
		/** The length of the ID */
		length: number;
		/** The collection against which the ID should be unique */
		collection: foundry.utils.Collection<string, any> | unknown[] | Map<string, unknown>;
	}

	export function randomID(
		length: RandomIDOptions["length"],
		options?: Omit<RandomIDOptions, "length">,
	): string;
	export function randomID(options?: RandomIDOptions): string;
}
