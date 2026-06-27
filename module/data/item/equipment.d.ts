export {};

declare module "./equipment.mjs" {
	interface Equipment {
		type: keyof typeof curseborne.config.equipmentTypes;
		equipped: boolean;

		armor: number;
		enhancement: number;
	}
}
