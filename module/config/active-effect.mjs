import { COMPLICATION } from "./dice.mjs";

export const STATUS_EFFECTS = /** @type {const} */ ({
	aggravatedWound: {
		name: "CURSEBORNE.STATUS_EFFECTS.AggravatedWound",
		img: "",
		system: { label: "combat" },
	},
	agony: {
		name: "CURSEBORNE.STATUS_EFFECTS.Agony",
		img: "",
		system: {
			label: "combat",
			difficulties: { agony: { value: 1 } },
		},
	},
	awed: {
		name: "CURSEBORNE.STATUS_EFFECTS.Awed",
		img: "",
		system: {
			label: "social",
			difficulties: {
				awed: { value: 1, hint: "CURSEBORNE.STATUS_EFFECTS.AwedHint" },
			},
			complcations: {
				awed: {
					value: COMPLICATION.MODERATE,
					hint: "CURSEBORNE.STATUS_EFFECTS.AwedHint",
				},
			},
		},
	},
	bleeding: {
		name: "CURSEBORNE.STATUS_EFFECTS.Bleeding",
		img: "",
		reference: "",
		system: {
			label: "combat",
			complications: {
				bleeding: {
					value: COMPLICATION.MINOR,
				},
			},
		},
	},
	burning: {
		name: "CURSEBORNE.STATUS_EFFECTS.Burning",
		img: "",
	},
	composed: {
		name: "CURSEBORNE.STATUS_EFFECTS.Composed",
		img: "",
		system: {
			enhancements: {
				composed: {
					value: 1,
					hint: "CURSEBORNE.STATUS_EFFECTS.ComposedHint",
				},
			},
		},
	},
	confused: {
		name: "CURSEBORNE.STATUS_EFFECTS.Confused",
		img: "",
		system: {
			label: "social",
			difficulties: {
				confused: { value: 1, label: "CURSEBORNE.STATUS_EFFECTS.ConfusedHint" },
			},
		},
	},
	crestfallen: {
		name: "CURSEBORNE.STATUS_EFFECTS.Crestfallen",
		img: "",
		system: { label: "social" },
	},
	dazed: {
		name: "CURSEBORNE.STATUS_EFFECTS.Dazed",
		img: "",
		system: { label: "combat" },
	},
	deprived: {
		name: "CURSEBORNE.STATUS_EFFECTS.Deprived",
		img: "",
		system: {
			difficulties: { deprived: { value: 1 } },
		},
	},
	destroyedReputation: {
		name: "CURSEBORNE.STATUS_EFFECTS.DestroyedReputation",
		img: "",
		system: { label: "social" },
	},
	drained: {
		name: "CURSEBORNE.STATUS_EFFECTS.Drained",
		system: {
			complications: {
				drained: {
					value: COMPLICATION.MODERATE,
				},
			},
		},
	},
	ennui: {
		name: "CURSEBORNE.STATUS_EFFECTS.Ennui",
		img: "",
		system: { label: "social", difficulties: { ennui: { value: 1 } } },
	},
	enraptured: {
		name: "CURSEBORNE.STATUS_EFFECTS.Enraptured",
		img: "",
	},
	exhausted: {
		name: "CURSEBORNE.STATUS_EFFECTS.Exhausted",
		img: "",
		system: {
			complications: {
				exhausted: {
					value: COMPLICATION.MODERATE,
				},
			},
		},
	},
	exposure: {
		name: "CURSEBORNE.STATUS_EFFECTS.Exposure",
		img: "",
	},
	fastActingToxin: {
		name: "CURSEBORNE.STATUS_EFFECTS.FastActingToxin",
		img: "",
	},
	frayedTemper: {
		name: "CURSEBORNE.STATUS_EFFECTS.FrayedTemper",
		img: "",
		system: {
			label: "social",
			complications: { frayedTemper: { value: COMPLICATION.MINOR } },
			difficulties: { frayedTemper: { value: 1 } },
		},
	},
	grappled: {
		name: "CURSEBORNE.STATUS_EFFECTS.Grappled",
		img: "",
		system: { label: "combat" },
	},
	guiltRidden: {
		name: "CURSEBORNE.STATUS_EFFECTS.GuiltRidden",
		img: "",
		system: {
			label: "social",
			complications: {
				guiltRidden: {
					value: COMPLICATION.MINOR,
					hint: "CURSEBORNE.STATUS_EFFECTS.GuiltRiddenHint",
				},
			},
		},
	},
	immobilized: {
		name: "CURSEBORNE.STATUS_EFFECTS.Immobilized",
		img: "",
		system: { label: "combat" },
	},
	inspired: {
		name: "CURSEBORNE.STATUS_EFFECTS.Inspired",
		img: "",
	},
	infected: {
		name: "CURSEBORNE.STATUS_EFFECTS.Infected",
		img: "",
		system: { complications: { infected: { value: COMPLICATION.MODERATE } } },
	},
	liar: {
		name: "CURSEBORNE.STATUS_EFFECTS.Liar",
		img: "",
		system: { label: "social" },
	},
	loss: {
		name: "CURSEBORNE.STATUS_EFFECTS.Loss",
		img: "",
		system: { label: "combat" },
	},
	mortallyWounded: {
		name: "CURSEBORNE.STATUS_EFFECTS.MortallyWounded",
		img: "",
		system: { label: "combat" },
	},
	refreshed: {
		name: "CURSEBORNE.STATUS_EFFECTS.Refreshed",
		img: "",
		system: { enhancements: { refreshed: { value: 1 } } },
	},
	sleepingPills: {
		name: "CURSEBORNE.STATUS_EFFECTS.SleepingPills",
		img: "",
		system: { complications: { sleepingPills: { value: COMPLICATION.MAJOR } } },
	},
	slowed: {
		name: "CURSEBORNE.STATUS_EFFECTS.Slowed",
		img: "",
	},
	slowActingToxin: {
		name: "CURSEBORNE.STATUS_EFFECTS.SlowActingToxin",
		img: "",
		complications: {
			slowActingToxinStart: { value: COMPLICATION.MINOR },
			slowActingToxinEnd: { value: COMPLICATION.MAJOR },
		},
	},
	stunned: {
		name: "CURSEBORNE.STATUS_EFFECTS.Stunned",
		img: "",
		system: {
			label: "combat",
			complications: { stunned: { value: COMPLICATION.MODERATE } },
		},
	},
	takenOut: {
		name: "CURSEBORNE.STATUS_EFFECTS.TakenOut",
		img: "",
		system: { label: "combat" },
	},
	terrified: {
		name: "CURSEBORNE.STATUS_EFFECTS.Terrified",
		img: "",
		system: { complications: { terrified: { value: COMPLICATION.MODERATE } } },
	},
	unexpectedFavor: {
		name: "CURSEBORNE.STATUS_EFFECTS.UnexpectedFavor",
		img: "",
		system: { label: "social" },
	},
	unlucky: {
		name: "CURSEBORNE.STATUS_EFFECTS.Unlucky",
		img: "",
		system: { complications: { unlucky: { value: COMPLICATION.MINOR } } },
	},
});
