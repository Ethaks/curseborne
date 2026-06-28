// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

export {};

declare module "./equipment.mjs" {
	interface Equipment {
		type: keyof typeof curseborne.config.equipmentTypes;
		equipped: boolean;

		armor: number;
		enhancement: number;
	}
}
