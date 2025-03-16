import { requiredInteger } from "./helpers/utils.mjs";

export function registerSettings() {
	// Momentum
	game.settings.register("curseborne", "momentum", {
		name: "CURSEBORNE.Settings.Momentum.Name",
		hint: "CURSEBORNE.Settings.Momentum.Hint",
		scope: "world",
		config: false,
		onChange: () => foundry.applications.instances.get("curseborne-momentum")?.render(),
		type: new foundry.data.fields.NumberField({
			...requiredInteger,
			initial: 0,
			step: 1,
		}),
	});
}
