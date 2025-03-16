import { systemTemplate } from "@helpers/utils.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { CurseborneTypeDataModel } from "../base.mjs";

export class CurseborneItemBase extends CurseborneTypeDataModel {
	/**
	 * Data relating to all instances of this item type model.
	 *
	 * @type {Readonly<ItemTypeMetadata>}
	 */
	static metadata = Object.freeze({
		...super.metadata,
		embedTemplate: systemTemplate("item/tooltips/common"),
	});

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = {};

		schema.description = new fields.HTMLField();

		return schema;
	}

	/**
	 * Whether this item is a non-embedded item in a compendium.
	 *
	 * @type {boolean}
	 */
	get isPackItem() {
		return this.pack && !this.isEmbedded;
	}

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;

		// Prevent creation of item if they would be embedded in an invalid actor type
		if (
			this.parent.isEmbedded &&
			this.constructor.metadata?.invalidActorTypes?.includes(this.parent.parent.type)
		) {
			return false;
		}
	}

	/* -------------------------------------------- */
	/*  Sheet Rendering                             */
	/* -------------------------------------------- */
	async prepareSheetContext(context) {}

	/* -------------------------------------------- */
	/* Embed Preparation                            */
	/* -------------------------------------------- */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Fall back to description as common tooltip content
		if (this.description) {
			context.description = await foundry.applications.ux.TextEditor.enrichHTML(this.description, {
				relativeTo: this.parent,
				secrets: this.parent.isOwner,
				rollData: context.rollData ?? this.parent.getRollData(),
			});
		}

		// Add dots input as subtitle, if dots are present
		if (this.schema.fields.dots instanceof DotsField) {
			context.subtitle += this.schema.fields.dots.toInput({
				value: this.dots.value,
				max: this.dots.max,
				disabled: true,
			}).outerHTML;
		}

		return context;
	}
}

/**
 * Limit the actor types that can contain this item.
 *
 * @param {typeof CurseborneItemBase} Base
 * @param {string | string[]} type - Actor types that cannot contain this item; defaults to "adversary".
 */
export function LimitedActorTypesItem(Base, type = "adversary") {
	return class AccursedItem extends Base {
		static {
			type = Array.isArray(type) ? type : [type];
			this.metadata = Object.freeze({
				...super.metadata,
				invalidActorTypes: [...(super.metadata.invalidActorTypes ?? []), ...type],
			});
		}
	};
}
