import * as activeEffect from "./active-effect.mjs";
import * as actor from "./actor.mjs";
import * as dice from "./dice.mjs";
import * as item from "./item.mjs";

export const CURSEBORNE = {
	...actor,
	...item,
	...dice,
	...activeEffect,
};
