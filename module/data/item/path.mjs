import { toLabelObject } from "@helpers/utils.mjs";
import { CollectionField } from "@models/fields/object.mjs";
import { Complication, Enhancement } from "@models/modifiers.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Path extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Path"];

	/** @inheritDoc */
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;

		// Every path has associated skills on which dots can be spent
		schema.skills = new fields.SetField(
			new fields.StringField({
				required: true,
				blank: false,
			}),
			{ required: true },
		);

		// Every path has a spread of dots that can be spent on attribute groups, one set for when it is a major path, one for minor
		schema.attributes = new fields.SchemaField(
			["major", "minor"].reduce((groups, group) => {
				groups[group] = new fields.SchemaField(
					Object.keys(curseborne.config.attributeGroups).reduce((attributes, attribute) => {
						attributes[attribute] = new fields.NumberField({
							required: true,
							nullable: false,
							integer: true,
							initial: 0,
							min: 0,
						});
						return attributes;
					}, {}),
				);
				return groups;
			}, {}),
			{ required: true },
		);

		// Lineage and family paths provide an inheritance if they are major
		// TODO: Should this be a simple field or a full document (to be referenced?)
		schema.inheritance = new fields.HTMLField({ required: true, blank: true });

		schema.enhancements = new CollectionField(new fields.EmbeddedDataField(Enhancement));
		schema.complications = new CollectionField(new fields.EmbeddedDataField(Complication));

		return schema;
	}

	async setMajor() {
		if (!this.actor) return;
		return this.actor.update({ "system.major": this.parent.id });
	}

	/**
	 * Generate an array containing Path Items or their index entries.
	 *
	 * @returns {Promise<(Item | object)[]>}
	 */
	static async getAllPaths(actor) {}

	static getAllPathsSync(actor) {}

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		if ((await super._preCreate(data, options, user)) === false) return false;

		// Prevent creation of a second path of a given type within an actor
		if (this.item.isEmbedded) {
			const existing = this.actor.itemTypes.path.find((p) => p.type === this.parent.type);
			if (existing) {
				ui.notifications?.error(
					game.i18n.format("CURSEBORNE.ERROR.DuplicateItemType", {
						type: game.i18n.localize(`TYPES.Item.${this.parent.type}`),
					}),
				);
				return false;
			}
		}
	}

	/** @override */
	async prepareSheetContext(context) {
		const choices = this.actor
			? toLabelObject(
					this.actor.itemTypes.skill.map((skill) => [skill.system.identifier, skill.name]),
				)
			: toLabelObject(curseborne.config.skills);

		context.skills = {
			options: Object.entries(choices).map(([value, label]) => ({
				value,
				label,
			})),
		};
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		const canBeMajor = this.parent.type === "lineage" || this.parent.type === "family";
		const isMajor = this.actor?.system.major === this.parent.id;
		if (canBeMajor) {
			if (isMajor) context.subtitle += ` — ${game.i18n.localize("CURSEBORNE.Item.Path.Major")}`;
			else context.subtitle += ` — ${game.i18n.localize("CURSEBORNE.Item.Path.Minor")}`;
		}

		if (this.skills.size) {
			const skills = this.actor
				? this.skills.map((skill) => this.actor.system.skills[skill]?.parent.name)
				: this.skills.map((s) => game.i18n.localize(curseborne.config.skills[s].name));
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Path.FIELDS.skills.label"),
				value: game.i18n
					.getListFormatter({ type: "conjunction", style: "narrow" })
					.format(skills.filter((s) => s)),
			});
		}

		return context;
	}
}
