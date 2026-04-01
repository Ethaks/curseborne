// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { requiredInteger, SYSTEM_ID, toLabelObject } from "./helpers/utils.mjs";

export function registerSettings() {
	// Momentum
	game.settings.register("curseborne", "momentum", {
		scope: "world",
		config: false,
		onChange: () => foundry.applications.instances.get("curseborne-momentum")?.render(),
		type: new foundry.data.fields.NumberField({
			...requiredInteger,
			initial: 0,
			step: 1,
		}),
	});
	game.settings.register(SYSTEM_ID, "momentumConfirmation", {
		name: "CURSEBORNE.Settings.MomentumConfirmation.Name",
		hint: "CURSEBORNE.Settings.MomentumConfirmation.Hint",
		scope: "world",
		config: true,
		type: new foundry.data.fields.StringField({
			blank: false,
			required: true,
			initial: "all",
			choices: () =>
				toLabelObject({
					all: "CURSEBORNE.Settings.MomentumConfirmation.Choices.all",
					gain: "CURSEBORNE.Settings.MomentumConfirmation.Choices.gain",
					none: "CURSEBORNE.Settings.MomentumConfirmation.Choices.none",
				}),
		}),
	});
}
