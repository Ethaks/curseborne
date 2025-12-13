import { systemTemplate } from "@helpers/utils.mjs";

/**
 * A type model providing common functionality for the system's data models.
 *
 * @abstract
 * @template {foundry.abstract.Document} [Parent=foundry.abstract.Document]
 */
export class CurseborneTypeDataModel extends foundry.abstract.TypeDataModel {
	static metadata = Object.freeze({});

	/**
	 * The actor this model is associated with, if any.
	 *
	 * @type {curseborne.documents.CurseborneActor | undefined}
	 */
	get actor() {
		if (this.parent instanceof foundry.documents.Actor) return this.parent;
		if (
			this.parent instanceof foundry.documents.Item ||
			this.parent.actor instanceof foundry.documents.Actor
		)
			return this.parent.actor;
		if (this.parent instanceof foundry.documents.ActiveEffect) {
			// AE could be embedded in an actor
			if (this.parent.parent instanceof foundry.documents.Actor) return this.parent.parent;
			// Or could be embedded in Item that might or might not be embedded in an actor
			if (
				this.parent.parent instanceof foundry.documents.Item &&
				this.parent.parent.actor instanceof foundry.documents.Actor
			)
				return this.parent.parent.actor;
		}
		return undefined;
	}

	/**
	 * The item this model is associated with, if any.
	 *
	 * @type {curseborne.documents.CurseborneItem | undefined}
	 */
	get item() {
		if (this.parent instanceof foundry.documents.Item) return this.parent;
		if (this.parent instanceof foundry.documents.ActiveEffect) {
			if (this.parent.parent instanceof foundry.documents.Item) return this.parent.parent;
		}
		return undefined;
	}

	/**
	 * @type {Parent}
	 */
	get parent() {
		return super.parent;
	}

	/* -------------------------------------------- */
	/*  Embed Preparation                           */
	/* -------------------------------------------- */
	/**
	 * The template used to render the embed/tooltip for this document.
	 *
	 * @type {string}
	 */
	get embedTemplate() {
		return this.constructor.metadata.embedTemplate;
	}

	/** @inheritDoc */
	async toEmbed(config = {}, options = {}) {
		// Use the default template unless a leaner embed with only the description is requested
		config.template = config.descriptionOnly
			? systemTemplate("item/tooltips/description-only")
			: this.embedTemplate;
		const context = await this._prepareEmbedContext(config, options);

		const embed = document.createElement("div");
		embed.classList.add("curseborne", "tooltip", "item-tooltip", "curseborne-tooltip");
		embed.innerHTML = await foundry.applications.handlebars.renderTemplate(
			config.template,
			context,
		);
		return embed;
	}

	/**
	 * Prepare the context for rendering the tooltip or embed for this document.
	 *
	 * @param {object} config - The configuration object for the tooltip or embed.
	 * @param {object} options - Additional options for rendering.
	 * @returns {Promise<EmbedContext>}
	 */
	// biome-ignore lint/correctness/noUnusedFunctionParameters: keep original names for better documentation of semi-abstract/base method
	async _prepareEmbedContext(config, options) {
		const context = {
			doc: this.parent,
			system: this,

			// Header
			img: this.parent.img,
			title: this.parent.name,
			subtitle: game.i18n.localize(`TYPES.${this.parent.documentName}.${this.parent.type}`),

			// Details
			details: [],
		};

		// Add subtype to the subtitle, if available
		if (this.type) {
			const field = this.schema.fields.type;
			let choices = field.choices;
			if (choices instanceof Function) choices = choices();
			if (choices?.[this.type]) context.subtitle += ` — ${game.i18n.localize(choices[this.type])}`;
		}

		return context;
	}
}
