import { gsap as _gsap } from "../foundry/public/scripts/greensock/esm/index";
import * as _curseborne from "./curseborne.mjs";

declare global {
	var gsap: typeof _gsap & {
		to: typeof _gsap.core.Tween.to;
		from: typeof _gsap.core.Tween.from;
		fromTo: typeof _gsap.core.Tween.fromTo;
	};
	export import curseborne = _curseborne;
}
