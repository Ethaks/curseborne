import { DotsData } from "@models/fields/dots";

declare module "./dread-power.mjs" {
	interface DreadPower {
		type: {
			value: keyof typeof curseborne.config.dreadPowerTypes;
			custom: string;
		};
		injuries: keyof typeof curseborne.config.dreadPowerInjuries | null;
		uses: DotsData;
	}
}
