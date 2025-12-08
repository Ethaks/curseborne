import { COMPLICATION } from "./dice.mjs";

export const STATUS_EFFECTS = /** @type {const} */ ({
    aggravatedWound: {
        name: "CURSEBORNE.STATUS_EFFECTS.AggravatedWound",
        img: "systems/curseborne/assets/icons/status-effects/aggravated-wound.svg",
        system: { label: "combat" },
    },
    agony: {
        name: "CURSEBORNE.STATUS_EFFECTS.Agony",
        img: "systems/curseborne/assets/icons/status-effects/agony.svg",
        system: {
            label: "combat",
            difficulties: { agony: { value: 1 } },
        },
    },
    awed: {
        name: "CURSEBORNE.STATUS_EFFECTS.Awed",
        img: "systems/curseborne/assets/icons/status-effects/awed.svg",
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
        img: "systems/curseborne/assets/icons/status-effects/bleeding.svg",
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
        img: "systems/curseborne/assets/icons/status-effects/burning.svg",
    },
    composed: {
        name: "CURSEBORNE.STATUS_EFFECTS.Composed",
        img: "systems/curseborne/assets/icons/status-effects/composed.svg",
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
        img: "systems/curseborne/assets/icons/status-effects/confused.svg",
        system: {
            label: "social",
            difficulties: {
                confused: { value: 1, label: "CURSEBORNE.STATUS_EFFECTS.ConfusedHint" },
            },
        },
    },
    crestfallen: {
        name: "CURSEBORNE.STATUS_EFFECTS.Crestfallen",
        img: "systems/curseborne/assets/icons/status-effects/crestfallen.svg",
        system: { label: "social" },
    },
    dazed: {
        name: "CURSEBORNE.STATUS_EFFECTS.Dazed",
        img: "systems/curseborne/assets/icons/status-effects/dazed.svg",
        system: { label: "combat" },
    },
    deprived: {
        name: "CURSEBORNE.STATUS_EFFECTS.Deprived",
        img: "systems/curseborne/assets/icons/status-effects/deprived.svg",
        system: {
            difficulties: { deprived: { value: 1 } },
        },
    },
    destroyedReputation: {
        name: "CURSEBORNE.STATUS_EFFECTS.DestroyedReputation",
        img: "systems/curseborne/assets/icons/status-effects/destroyed-reputation.svg",
        system: { label: "social" },
    },
    drained: {
        name: "CURSEBORNE.STATUS_EFFECTS.Drained",
        img: "systems/curseborne/assets/icons/status-effects/drained.svg",
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
        img: "systems/curseborne/assets/icons/status-effects/ennui.svg",
        system: { label: "social", difficulties: { ennui: { value: 1 } } },
    },
    enraptured: {
        name: "CURSEBORNE.STATUS_EFFECTS.Enraptured",
        img: "systems/curseborne/assets/icons/status-effects/enraptured.svg",
    },
    exhausted: {
        name: "CURSEBORNE.STATUS_EFFECTS.Exhausted",
        img: "systems/curseborne/assets/icons/status-effects/exhausted.svg",
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
        img: "systems/curseborne/assets/icons/status-effects/exposure.svg",
    },
    fastActingToxin: {
        name: "CURSEBORNE.STATUS_EFFECTS.FastActingToxin",
        img: "systems/curseborne/assets/icons/status-effects/fast-acting-toxin.svg",
    },
    frayedTemper: {
        name: "CURSEBORNE.STATUS_EFFECTS.FrayedTemper",
        img: "systems/curseborne/assets/icons/status-effects/frayed-temper.svg",
        system: {
            label: "social",
            complications: { frayedTemper: { value: COMPLICATION.MINOR } },
            difficulties: { frayedTemper: { value: 1 } },
        },
    },
    grappled: {
        name: "CURSEBORNE.STATUS_EFFECTS.Grappled",
        img: "systems/curseborne/assets/icons/status-effects/grappled.svg",
        system: { label: "combat" },
    },
    guiltRidden: {
        name: "CURSEBORNE.STATUS_EFFECTS.GuiltRidden",
        img: "systems/curseborne/assets/icons/status-effects/guilt-ridden.svg",
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
        img: "systems/curseborne/assets/icons/status-effects/immobilized.svg",
        system: { label: "combat" },
    },
    inspired: {
        name: "CURSEBORNE.STATUS_EFFECTS.Inspired",
        img: "systems/curseborne/assets/icons/status-effects/inspired.svg",
    },
    infected: {
        name: "CURSEBORNE.STATUS_EFFECTS.Infected",
        img: "systems/curseborne/assets/icons/status-effects/infected.svg",
        system: { complications: { infected: { value: COMPLICATION.MODERATE } } },
    },
    liar: {
        name: "CURSEBORNE.STATUS_EFFECTS.Liar",
        img: "systems/curseborne/assets/icons/status-effects/liar.svg",
        system: { label: "social" },
    },
    loss: {
        name: "CURSEBORNE.STATUS_EFFECTS.Loss",
        img: "systems/curseborne/assets/icons/status-effects/loss.svg",
        system: { label: "combat" },
    },
    mortallyWounded: {
        name: "CURSEBORNE.STATUS_EFFECTS.MortallyWounded",
        img: "systems/curseborne/assets/icons/status-effects/mortally-wounded.svg",
        system: { label: "combat" },
    },
    refreshed: {
        name: "CURSEBORNE.STATUS_EFFECTS.Refreshed",
        img: "systems/curseborne/assets/icons/status-effects/refreshed.svg",
        system: { enhancements: { refreshed: { value: 1 } } },
    },
    sleepingPills: {
        name: "CURSEBORNE.STATUS_EFFECTS.SleepingPills",
        img: "systems/curseborne/assets/icons/status-effects/sleeping-pills.svg",
        system: { complications: { sleepingPills: { value: COMPLICATION.MAJOR } } },
    },
    slowed: {
        name: "CURSEBORNE.STATUS_EFFECTS.Slowed",
        img: "systems/curseborne/assets/icons/status-effects/slowed.svg",
    },
    slowActingToxin: {
        name: "CURSEBORNE.STATUS_EFFECTS.SlowActingToxin",
        img: "systems/curseborne/assets/icons/status-effects/slow-acting-toxin.svg",
        complications: {
            slowActingToxinStart: { value: COMPLICATION.MINOR },
            slowActingToxinEnd: { value: COMPLICATION.MAJOR },
        },
    },
    stunned: {
        name: "CURSEBORNE.STATUS_EFFECTS.Stunned",
        img: "systems/curseborne/assets/icons/status-effects/stunned.svg",
        system: {
            label: "combat",
            complications: { stunned: { value: COMPLICATION.MODERATE } },
        },
    },
    takenOut: {
        name: "CURSEBORNE.STATUS_EFFECTS.TakenOut",
        img: "systems/curseborne/assets/icons/status-effects/taken-out.svg",
        system: { label: "combat" },
    },
    terrified: {
        name: "CURSEBORNE.STATUS_EFFECTS.Terrified",
        img: "systems/curseborne/assets/icons/status-effects/terrified.svg",
        system: { complications: { terrified: { value: COMPLICATION.MODERATE } } },
    },
    unexpectedFavor: {
        name: "CURSEBORNE.STATUS_EFFECTS.UnexpectedFavor",
        img: "systems/curseborne/assets/icons/status-effects/unexpected-favor.svg",
        system: { label: "social" },
    },
    unlucky: {
        name: "CURSEBORNE.STATUS_EFFECTS.Unlucky",
        img: "systems/curseborne/assets/icons/status-effects/unlucky.svg",
        system: { complications: { unlucky: { value: COMPLICATION.MINOR } } },
    },
});