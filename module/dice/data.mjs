// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { ROLL_TYPE } from "@config/dice.mjs";
import { Complication, DifficultyChange, Enhancement } from "@models/modifiers.mjs";
import { CollectionField, DieSourceField } from "../data/fields/_module.mjs";
import { randomID, requiredInteger } from "../helpers/utils.mjs";

const fields = foundry.data.fields;
/**
 * The data object for a {@link CurseborneRoll}, containing all information needed to construct and evaluate a roll.
 */
export class CurseborneRollContext extends foundry.abstract.DataModel {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.DICE"];

	/** @inheritDoc */
	static defineSchema() {
		return {
			type: new fields.StringField({
				required: true,
				initial: ROLL_TYPE.GENERAL,
				choices: Object.values(ROLL_TYPE),
			}),
			sources: new CollectionField(new DieSourceField(), {
				required: true,
				nullable: false,
			}),
			target: new fields.NumberField({ initial: 8 }),
			double: new fields.NumberField({ initial: 10 }),
			curseDice: new fields.NumberField({ initial: 0 }),
			enhancements: new CollectionField(new fields.EmbeddedDataField(Enhancement)),
			momentum: new fields.NumberField({ initial: 0 }),
			autoHits: new fields.NumberField({ initial: 0 }),

			advantage: new fields.NumberField({ initial: 0 }),

			forcedSuccess: new fields.BooleanField({ initial: false }),

			difficulty: new fields.NumberField({
				initial: 1,
				nullable: true,
				choices: () => {
					const { DIFFICULTY, difficulties } = curseborne.config;
					return Object.fromEntries(
						Object.values(DIFFICULTY).map((value) => {
							const baseLabel = game.i18n.localize(difficulties[value].label);
							return [value, `${baseLabel} (${value})`];
						}),
					);
				},
			}),

			complications: new CollectionField(new fields.EmbeddedDataField(Complication)),
			difficulties: new CollectionField(new fields.EmbeddedDataField(DifficultyChange)),
			alteredOutcome: new fields.BooleanField({ initial: false }),
			tricks: new CollectionField(
				new fields.SchemaField({
					id: new fields.StringField({ initial: randomID }),
					uuid: new fields.DocumentUUIDField({ type: "Item", idOnly: true }),
					value: new fields.NumberField({
						...requiredInteger,
						initial: 1,
						max: 3,
					}),
				}),
			),

			// The `getRollData` result of the rolling actor; not to be persisted
			rollData: new fields.ObjectField(),
		};
	}

	/** @inheritDoc */
	_initializeSource(data = {}, options = {}) {
		/**
		 * Ensure that a source of the given type exists in the data object with a matching type and id.
		 * Data elements besides type and id will be merged non-destructively.
		 *
		 * @param {(string | { type: string, [key: string]: unknown })[]} types - The types of source to ensure, either as type string or source partial.
		 * @param {object} [options] - Additional options for ensuring sources.
		 * @param {boolean} [options.deleteOthers=true] - Whether to delete sources of other types.
		 */
		const ensureSources = (types = [], { deleteOthers = false } = {}) => {
			types = Array.isArray(types) ? types : [types];
			types = types.map((type) =>
				typeof type === "string"
					? { type, id: type }
					: { type: type.type ?? type.id, id: type.id ?? type.type, ...type },
			);

			const typeData = Object.fromEntries(types.map((type) => [type.id, { ...type }]));

			// Merge existing sources with new sources
			data.sources = foundry.utils.mergeObject(data.sources, typeData, {
				inplace: false,
			});

			if (deleteOthers) {
				for (const key of Object.keys(data.sources)) {
					if (!types.some((type) => type.id === key)) delete data.sources[key];
				}
			}
		};

		// Set sources according to the type of roll
		data.sources = this.schema.fields.sources.clean(data.sources);
		switch (data.type || ROLL_TYPE.GENERAL) {
			case ROLL_TYPE.GENERAL: {
				ensureSources(["skill", "attribute"]);
				break;
			}
			case ROLL_TYPE.DEFENSE: {
				ensureSources([{ type: "attribute", value: "@attributes.stamina.value" }]);
				break;
			}
			case ROLL_TYPE.POOL: {
				ensureSources("pool");
				break;
			}
			case ROLL_TYPE.CONTACT_INVOKE: {
				ensureSources("skill");
				break;
			}
			case ROLL_TYPE.CONTACT_SELF: {
				ensureSources([{ type: "contactPool", value: "8" }]);
				break;
			}
		}

		return super._initializeSource(data, options);
	}

	/** @inheritDoc */
	_initialize(data, options) {
		super._initialize(data, options);

		try {
			this.prepareData();
		} catch (err) {
			Hooks.onError(`${this.constructor.name}#_initialize`, err, {
				msg: `Failed data preparation for a roll made by ${this.actor}`,
				log: "error",
			});
		}
	}

	/**
	 * Derive additional data from the context's source data.
	 */
	prepareData() {
		// Advantage
		if (this.advantage < 0) {
			this.difficulty += Math.abs(this.advantage);
		}

		for (const enh of this.enhancements) {
			enh.value = curseborne.dice.CurseborneRoll.replaceFormulaData(enh.value, this) || "0";
			enh.value = curseborne.dice.CurseborneRoll.safeEval(enh.value);
		}

		// Find highest non-stacking enhancement and set as active while deactivating all other non-stacking enhancements
		const nonStacking = this.enhancements.filter((enh) => !enh.stacking);
		const highestNonStacking = nonStacking.reduce(
			(highest, enh) => (enh.value > (highest?.value ?? 0) ? enh : highest),
			null,
		);
		for (const enh of nonStacking) {
			enh.enabled = enh === highestNonStacking;
		}

		// Enable all stacking enhancements
		for (const enh of this.enhancements.filter((enh) => enh.stacking)) {
			enh.enabled = true;
		}

		for (const change of this.difficulties) {
			this.difficulty += change.value;
		}
	}

	/**
	 * Get the total number of dice to roll from this context's sources.
	 *
	 * @type {number}
	 */
	get dice() {
		return this.sources
			.filter((s) => s.value)
			.reduce((sum, source) => {
				const formula =
					curseborne.dice.CurseborneRoll.replaceFormulaData(source.value, this) || "0";
				return sum + curseborne.dice.CurseborneRoll.safeEval(formula);
			}, 0);
	}

	/**
	 * Get the summed up cost of all complications in this context.
	 * @type {number}
	 */
	get complicationsCost() {
		return this.complications.reduce((sum, { cost }) => sum + cost, 0);
	}

	/**
	 * Get an array of enhancements for this roll that have not been disabled.
	 *
	 * @type {{enabled: Enhancement[], disabled: Enhancement[]}}
	 */
	get groupedEnhancements() {
		const result = { enabled: [], disabled: [] };
		for (const enh of this.enhancements) {
			(enh.enabled ? result.enabled : result.disabled).push(enh);
		}
		return result;
	}

	/**
	 * Add a complication to this roll context.
	 *
	 * @param {Partial<Complication> | Partial<Complication>[]} data - The complication data to add.
	 * @param {object} [options] - Additional options for adding complications.
	 */
	addComplications(data = {}, options = {}) {
		data = Array.isArray(data) ? data : [data];

		// Add IDs to all complications not already having them
		const ids = Object.keys(this.complications);
		for (const complication of data) {
			if (complication.id) continue;
			const id = randomID({ collection: ids });
			ids.push(id);
			complication.id = id;
		}

		const cleaned = data.map((complication) =>
			this.schema.fields.complications.model.clean(complication),
		);
		const updateData = Object.fromEntries(
			cleaned.map((complication) => [complication.id, complication]),
		);

		return this.updateSource({ complications: updateData });
	}
}
