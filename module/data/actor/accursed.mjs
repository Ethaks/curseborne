import { ROLL_TYPE } from "@config/dice.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { CurseborneActorBase } from "./base.mjs";

/** @import { ActorRollResult } from "@dice/roll" */

export class Accursed extends CurseborneActorBase {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Actor.Accursed"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();

		schema.attributes = new fields.SchemaField(
			Object.entries(curseborne.config.attributes).reduce((attributes, [id, attribute]) => {
				attributes[id] = new DotsField({ max: 5 }, { label: attribute.label });
				return attributes;
			}, {}),
			{ required: true },
		);

		// Treat injuries like a vector, derive injury level from value
		schema.injuries = new DotsField({ max: 7 }, { required: true });

		schema.aspirations = new fields.SchemaField({
			short1: new fields.HTMLField({ required: true, blank: true }),
			short2: new fields.HTMLField({ required: true, blank: true }),
			long: new fields.HTMLField({ required: true, blank: true }),
		});

		schema.major = new fields.ForeignDocumentField(foundry.documents.Item, {
			idOnly: true,
		});

		schema.entanglement = new DotsField(
			{ max: 4 },
			{ required: true, label: "CURSEBORNE.Entanglement" },
		);

		schema.curseDice = new DotsField({ max: 5 }, { required: true, label: "CURSEBORNE.CurseDice" });

		schema.xp = new fields.SchemaField({
			current: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			}),
		});

		// Optional UI flags persisted on the character
		schema.ui = new fields.SchemaField({
			showToken: new fields.BooleanField({ initial: false }),
		});

		return schema;
	}

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;

		// Add default skills as per config unless a skill with a similar ID is already present
		const skillConfigs = curseborne.config.skills;
		const existingSkills = this.parent.items
			.filter((i) => i.type === "skill")
			.map((i) => i.system.identifier);
		const skills = (
			await Promise.all(
				Object.entries(skillConfigs).map(async ([key, skillConfig]) => {
					let { id, ...data } = skillConfig;
					if (!id) id = key;
					if (existingSkills.includes(id)) return null;
					if (data.uuid) data = await foundry.utils.fromUuid(data.uuid)?.toObject();
					else
						data = new foundry.documents.Item.implementation({
							type: "skill",
							...data,
						}).toObject();
					data.name = game.i18n.localize(data.name);
					return data;
				}),
			)
		).filter((s) => s);

		// Add token settings
		const prototypeToken = foundry.utils.mergeObject(
			{ actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY },
			data?.prototypeToken || {},
		);

		this.parent.updateSource({
			prototypeToken,
			items: [...this.parent.items.map((i) => i.toObject()), ...skills],
		});
	}

	/** @inheritDoc */
	prepareBaseData() {
		super.prepareBaseData();

		// 5 curse dice by default, 7 at entanglement 2 and 3, 9 at entanglement 4
		// TODO: Re-visit scaling when higher entanglement levels are possible
		this.curseDice.max = 5 + Math.floor(this.entanglement.value / 2) * 2;

		this._prepareInjuries();
	}

	_prepareInjuries() {
		const { value } = this.injuries;
		this.injuries.level = null;
		const injuryLevels = curseborne.config.injuryLevels;

		let currentRequired = Object.values(injuryLevels).reduce((acc, config) => acc + config.size, 0);
		// Start from the most severe level; if the current injuries are below the counter, it applies;
		// otherwise, move to the next level
		for (const [level, config] of Object.entries(injuryLevels)) {
			currentRequired -= config.size;
			if (value <= currentRequired) {
				this.injuries.level = level;
			}
		}

		// Set injury dice based on level
		this.injuries.dice = curseborne.config.injuryLevels[this.injuries.level]?.dice || 0;
	}

	/** @inheritDoc */
	prepareDerivedData() {
		super.prepareDerivedData();

		// Add armor from equipment
		for (const item of this.parent.itemTypes.equipment) {
			if (item.system.armor) {
				this.armor.max += item.system.armor;
			}
		}
	}

	/** @type {LineageItem} */
	get lineage() {
		return this.parent.itemTypes.lineage[0];
	}

	/** @type {FamilyItem} */
	get family() {
		return this.parent.itemTypes.family[0];
	}

	/** @type {RoleItem} */
	get role() {
		return this.parent.itemTypes.role[0];
	}

	getRollData() {
		const data = {};
		return data;
	}

	/** @inheritDoc */
	_prepareCommonRollOptions(options) {
		super._prepareCommonRollOptions(options);
		options.data.curseDice ??= this.curseDice.value;
		return options;
	}

	/**
	 * Creates a new generic roll of a specific type for this actor, or updates the in-progress one for that type.
	 *
	 * @param {string | string[]} sources - The source(s) of the roll.
	 * @param {ActorRollOptions} options - The options for the roll.
	 * @returns {Promise<ActorRollResult>} An object containing a roll and a message, if any.
	 */
	async roll(sources = [], options = {}) {
		options = this._prepareCommonRollOptions(options);

		if (!Array.isArray(sources)) sources = [sources];

		// To make the API as leneient as possible for macros,
		// source elements can be attribute ids, or skill ids, or skill system identifiers
		const sourceObjects = sources
			.map((source) => {
				// Check for attribute
				if (source in curseborne.config.attributes)
					return { type: "attribute", value: `@attributes.${source}.value` };

				// Check for skill identifier
				if (source in this.skills) return { type: "skill", value: `@skills.${source}.dots.value` };

				// Check for skill ID
				const item = this.actor.items.get(source);
				if (item && item.type === "skill")
					return {
						type: "skill",
						value: `@skills.${item.system.identifier}.dots.value`,
					};

				return null;
			})
			.filter((source) => source);
		for (const source of sourceObjects) {
			options.data.sources ??= {};
			options.data.sources[source.type] = source;
		}

		return this._createRoll(ROLL_TYPE.GENERAL, options);
	}

	/** @inheritDoc */
	_onRollInitialize(roll) {
		super._onRollInitialize(roll);

		// Add injury dice source to the roll if applicable, or remove if present and not applicable
		if (roll.data.type === ROLL_TYPE.GENERAL) {
			const skillSource =
				roll.data.sources.get("skill") ?? roll.data.sources.find((s) => s.type === "skill");
			const { dice, level } = this.injuries;
			const skillIdentifier = skillSource.value.match(/@skills\.(.+)\.dots\.value/)?.[1];
			const isPathSkill = this.skills[skillIdentifier]?.isPathSkill;

			if (level && dice > 0 && isPathSkill) {
				roll.data.updateSource({
					"sources.injury": {
						id: "injury",
						type: "injury",
						value: "@injuries.dice",
					},
				});
			} else if (roll.data.sources.has("injury") && !(isPathSkill && level)) {
				roll.data.updateSource({ "sources.-=injury": null });
			}
			roll.terms = roll.constructor.parse("", roll.data);
		}
	}

	async rollDefense(options = {}) {
		options = this._prepareCommonRollOptions(options);
		options.data.difficulty ??= 0;
		return this._createRoll(ROLL_TYPE.DEFENSE, options);
	}
}
