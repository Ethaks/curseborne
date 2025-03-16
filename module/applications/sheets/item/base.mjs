import { CurseborneModifiersMixin } from "@applications/common/modifiers.mjs";
import { systemTemplate } from "../../../helpers/utils.mjs";
import { TabsMixin } from "../../common/tabs.mjs";
import { CurseborneDocumentSheetMixin } from "../document-mixin.mjs";

const { api } = foundry.applications;

/**
 * Extend the basic ItemSheet with some very simple modifications
 */
export class CurseborneItemSheet extends CurseborneModifiersMixin.mixin(
	CurseborneDocumentSheetMixin(
		TabsMixin(api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2)),
	),
) {
	constructor(options = {}) {
		super(options);
	}

	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["curseborne", "item"],
		window: {
			resizable: true,
			controls: [
				{
					action: "showArtwork",
					icon: "fa-solid fa-image",
					label: "SIDEBAR.CharArt",
					ownership: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
				},
			],
		},
		position: {
			height: 600,
		},
		actions: {
			toggleEffect: this._toggleEffect,
			showArtwork: this._showArtwork,
		},
	};

	/* -------------------------------------------- */

	/** @override */
	static PARTS = {
		header: {
			template: "systems/curseborne/templates/item/header.hbs",
		},
		tabs: {
			template: "templates/generic/tab-navigation.hbs",
		},
		description: {
			template: "systems/curseborne/templates/item/description.hbs",
		},
		details: {
			template: "",
			scrollable: [""],
		},
		...CurseborneModifiersMixin.modifierPart,
		effects: {
			template: "systems/curseborne/templates/item/effects.hbs",
		},
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "description", icon: "fa-solid fa-book " },
				{ id: "details", icon: "fa-solid fa-list" },
				CurseborneModifiersMixin.modifierTab,
				{ id: "effects", icon: "fa-solid fa-person-rays" },
			],
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		// Only show subset of tabs for limited permissions
		if (this.document.limited) options.parts = ["header", "tabs", "description"];

		if (!["enhancements", "complications"].some((p) => this.document.system.schema.fields[p])) {
			options.parts = options.parts.filter((p) => p !== "modifiers");
		}
	}

	_configureRenderParts(options) {
		const parts = super._configureRenderParts(options);
		parts.details.template =
			this.document.system.constructor?.metadata?.details ??
			systemTemplate(`item/details/${this.document.type}`);
		return parts;
	}

	/** @override */
	_getHeaderControls() {
		const controls = super._getHeaderControls();

		// Item artwork
		const img = this.item.img;
		const defaultArtwort = foundry.documents.Item.implementation.getDefaultArtwork(
			this.item.toObject(),
		);
		if (img === defaultArtwort.img) controls.findSplice((c) => c.action === "showArtwork");

		return controls;
	}

	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		await this.item.system?.prepareSheetContext?.(context);

		return context;
	}

	/** @override */
	async _preparePartContext(partId, context) {
		context = await super._preparePartContext(partId, context);
		switch (partId) {
			case "description":
				context.tab = context.tabs[partId];
				// Enrich description info for display
				// Enrichment turns text like `[[/r 1d20]]` into buttons
				context.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(
					this.item.system.description,
					{
						// Whether to show secret blocks in the finished html
						secrets: this.document.isOwner,
						// Data to fill in for inline rolls
						rollData: this.item.getRollData(),
						// Relative UUID resolution
						relativeTo: this.item,
					},
				);
				break;
			case "effects":
				context.tab = context.tabs[partId];
				// Prepare active effects for easier access
				context.effects = this._prepareActiveEffectCategories(context);
				break;
		}
		return context;
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		super._onRender(context, options);
	}

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/

	/**
	 * Determines effect parent to pass to helper
	 *
	 * @this CurseborneItemSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @private
	 */
	static async _toggleEffect(event, target) {
		const effect = await this.getDocument(target);
		await effect.update({ disabled: !effect.disabled });
	}

	/**
	 * Show the artwork for an item
	 *
	 * @this {CurseborneItemSheet}
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 */
	static async _showArtwork(event, target) {
		const { img, name, uuid } = this.item;
		new foundry.applications.apps.ImagePopout({
			src: img,
			uuid,
			window: { title: name },
		}).render({
			force: true,
		});
	}

	/* -------------------------------------------- */

	/**
	 * Handle the dropping of ActiveEffect data onto an Actor Sheet
	 * @param {DragEvent} event                  The concluding DragEvent which contains drop data
	 * @param {object} data                      The data transfer extracted from the event
	 * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
	 * @protected
	 */
	async _onDropActiveEffect(event, data) {
		const aeCls = getDocumentClass("ActiveEffect");
		const effect = await aeCls.fromDropData(data);
		if (!this.item.isOwner || !effect) return false;

		if (this.item.uuid === effect.parent?.uuid) return this._onEffectSort(event, effect);
		return aeCls.create(effect, { parent: this.item });
	}

	/**
	 * Sorts an Active Effect based on its surrounding attributes
	 *
	 * @param {DragEvent} event
	 * @param {ActiveEffect} effect
	 */
	_onEffectSort(event, effect) {
		const effects = this.item.effects;
		const dropTarget = event.target.closest("[data-effect-id]");
		if (!dropTarget) return;
		const target = effects.get(dropTarget.dataset.effectId);

		// Don't sort on yourself
		if (effect.id === target.id) return;

		// Identify sibling items based on adjacent HTML elements
		const siblings = [];
		for (const el of dropTarget.parentElement.children) {
			const siblingId = el.dataset.effectId;
			if (siblingId && siblingId !== effect.id) siblings.push(effects.get(el.dataset.effectId));
		}

		// Perform the sort
		const sortUpdates = foundry.utils.performIntegerSort(effect, {
			target,
			siblings,
		});
		const updateData = sortUpdates.map((u) => {
			const update = u.update;
			update._id = u.target._id;
			return update;
		});

		// Perform the update
		return this.item.updateEmbeddedDocuments("ActiveEffect", updateData);
	}

	/* -------------------------------------------- */

	/**
	 * Handle dropping of an Actor data onto another Actor sheet
	 * @param {DragEvent} event            The concluding DragEvent which contains drop data
	 * @param {object} data                The data transfer extracted from the event
	 * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
	 *                                     not permitted.
	 * @protected
	 */
	async _onDropActor(event, data) {
		if (!this.item.isOwner) return false;
	}

	/* -------------------------------------------- */

	/**
	 * Handle dropping of an item reference or item data onto an Actor Sheet
	 * @param {DragEvent} event            The concluding DragEvent which contains drop data
	 * @param {object} data                The data transfer extracted from the event
	 * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
	 * @protected
	 */
	async _onDropItem(event, data) {
		if (!this.item.isOwner) return false;
	}

	/* -------------------------------------------- */

	/**
	 * Handle dropping of a Folder on an Actor Sheet.
	 * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
	 * @param {DragEvent} event     The concluding DragEvent which contains drop data
	 * @param {object} data         The data transfer extracted from the event
	 * @returns {Promise<Item[]>}
	 * @protected
	 */
	async _onDropFolder(event, data) {
		if (!this.item.isOwner) return [];
	}
}
