import { SessionSetting } from "@helpers/session-setting.mjs";

/** @import { ContextMenuEntry } from "@foundry/client-esm/applications/ui/context.mjs";

/**
 * A Mixin for DocumentSheets that adds some common functionality, including
 *   - Edit and Play mode
 *   - Basic context preparation
 *
 * @param {typeof foundry.applications.api.DocumentSheetV2} Base
 */
export function CurseborneDocumentSheetMixin(Base) {
	return class CurseborneDocumentSheet extends Base {
		/** @inheritDoc */
		static DEFAULT_OPTIONS = {
			classes: ["curseborne"],
			actions: {
				onEditImage: this._onEditImage,
				toggleMode: this._onToggleMode,
				createDoc: this._onCreateDocument,
				deleteDoc: this._onDeleteDocument,
				copyDoc: this._onDuplicateDocument,
				contextMenu: this._onOpenContextMenu,
			},
			dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
			form: { submitOnChange: true },
		};

		/** @inheritDoc */
		_initializeApplicationOptions(options) {
			options = super._initializeApplicationOptions(options);
			options.classes.push(options.document.type);
			return options;
		}

		/** @inheritDoc */
		async _prepareContext(options) {
			const context = await super._prepareContext(options);

			Object.assign(context, {
				isEditable: this.isEditable,
				editable: this.isEditable && this.isEditMode,
				owner: this.document.isOwner,
				limited: this.document.limited,

				document: this.document,
				system: this.document.system,
				flags: this.document.flags,
				fields: this.document.schema.fields,
				systemFields: this.document.system.schema.fields,
				config: CONFIG.CURSEBORNE,
				rollData: this.document.getRollData?.(),

				isEditMode: this.isEditMode,
				isPlayMode: this.isPlayMode,
			});

			switch (this.document.documentName) {
				case "Item":
					context.item = context.document;
					break;
				case "Actor":
					context.actor = context.document;
					break;
				case "ActiveEffect":
					context.effect = context.document;
					break;
			}

			context.formGroupOptions = {
				model: this.document,
				rootId: context.rootId,
				source: context.source,
				isEditMode: context.isEditMode,
				localize: true,
			};

			return context;
		}

		_prepareActiveEffectCategories(context) {
			// Define effect header categories
			const categories = {
				temporary: {
					type: "temporary",
					label: game.i18n.localize("CURSEBORNE.Effect.Temporary"),
					effects: [],
				},
				passive: {
					type: "passive",
					label: game.i18n.localize("CURSEBORNE.Effect.Passive"),
					effects: [],
				},
				inactive: {
					type: "inactive",
					label: game.i18n.localize("CURSEBORNE.Effect.Inactive"),
					effects: [],
				},
			};

			const addEffect = (effect) => {
				let category;
				if (effect.disabled) category = categories.inactive;
				else if (effect.isTemporary) category = categories.temporary;
				else category = categories.passive;

				category.effects.push({
					effect,
					relativeUuid: effect.getRelativeUUID(this.document),
				});
			};

			if (this.document instanceof foundry.documents.Actor) {
				for (const e of this.document.allApplicableEffects()) {
					addEffect(e);
				}
			} else {
				for (const e of this.document.effects) {
					addEffect(e);
				}
			}

			// Sort each category
			for (const c of Object.values(categories)) {
				c.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
			}
			return categories;
		}

		/** @inheritDoc */
		async _renderFrame(options = {}) {
			const frame = await super._renderFrame(options);

			// Add edit mode slide-toggle to the header
			const slideToggle = document.createElement("slide-toggle");
			slideToggle.classList.add("sheet-mode");
			slideToggle.checked = this.isEditMode;
			slideToggle.setAttribute("data-action", "toggleMode");
			slideToggle.dataset.tooltip = "CURSEBORNE.EditMode";
			// Insert before header buttons
			frame
				.querySelector(".window-header button")
				.insertAdjacentElement("beforebegin", slideToggle);

			return frame;
		}

		/** @inheritDoc */
		_attachFrameListeners() {
			super._attachFrameListeners();

			// ContextMenu for actual items (and not just item-like lists)
			this._createContextMenu(
				this._getContextMenuOptions.bind(this),
				".items-list .item[data-item-id], .effect-list .effect[data-effect-id]",
			);
		}

		/** @inheritDoc */
		_onRender(context, options) {
			super._onRender(context, options);

			// HACK: Assign action to prevent hard-private onDoubleClick minimizing from triggering
			for (const el of this.element.querySelectorAll(".window-header .sheet-mode *")) {
				el.dataset.action ??= "toggleMode";
			}

			// Add special styling for label-top hints.
			for (const hint of this.element.querySelectorAll(".label-top > p.hint")) {
				const label = hint.parentElement.querySelector(":scope > label");
				if (!label) continue;
				hint.ariaLabel = hint.innerText;
				hint.dataset.tooltip = hint.innerHTML;
				hint.dataset.tooltipDirection ??=
					foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.UP;
				hint.innerHTML = "";
				label.insertAdjacentElement("beforeend", hint);
			}
		}

		/* -------------------------------------------- */
		/*                  Edit Mode                   */
		/* -------------------------------------------- */

		/**
		 * The different sheet modes available.
		 *
		 * @enum
		 */
		static SHEET_MODES = /** @type {const} */ ({ EDIT: 0, PLAY: 1 });

		/**
		 * The sheet's current mode.
		 *
		 * @protected
		 * @type {typeof DocumentSheetMM3.SHEET_MODES[keyof typeof DocumentSheetMM3.SHEET_MODES]}
		 */
		get _sheetMode() {
			return this.#sheetModeSetting.get();
		}
		set _sheetMode(value) {
			this.#sheetModeSetting.set(value);
		}

		#sheetModeSetting = new SessionSetting(`${this.id}.sheetMode`, {
			schema: new foundry.data.fields.NumberField({
				required: true,
				initial: this.constructor.SHEET_MODES.PLAY,
				choices: Object.values(this.constructor.SHEET_MODES),
			}),
		});

		/**
		 * Whether the sheet is in edit mode.
		 *
		 * @type {boolean}
		 */
		get isEditMode() {
			return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
		}

		/**
		 * Whether the sheet is in play mode.
		 *
		 * @type {boolean}
		 */
		get isPlayMode() {
			return this._sheetMode === this.constructor.SHEET_MODES.PLAY;
		}

		/**
		 * Toggle the sheet's mode between edit and play.
		 *
		 * @this {CurseborneDocumentSheet}
		 * @param {PointerEvent} event
		 * @param {HTMLElement} target
		 * @protected
		 */
		static _onToggleMode(event, target) {
			const mode = this._sheetMode === this.constructor.SHEET_MODES.EDIT ? 1 : 0;
			this._sheetMode = mode;
			this.render();
		}

		/* -------------------------------------------- */
		/*                Drag and Drop                 */
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
			if (!this.document.isOwner) return [];
			const folder = await foundry.documents.Folder.implementation.fromDropData(data);
			if (folder.type !== "Item") return [];
			const droppedItemData = await Promise.all(
				folder.contents.map(async (item) => {
					if (!(document instanceof foundry.documents.Item))
						item = await foundry.utils.fromUuid(item.uuid);
					return item;
				}),
			);
			return this._onDropItemCreate(droppedItemData, event);
		}

		/**
		 * Handle the final creation of dropped Item data on the Actor.
		 * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
		 * @param {object[]|object} itemData      The item data requested for creation
		 * @param {DragEvent} event               The concluding DragEvent which provided the drop data
		 * @returns {Promise<Item[]>}
		 * @private
		 */
		async _onDropItemCreate(itemData, event) {
			itemData = Array.isArray(itemData) ? itemData : [itemData];
			return this.document.createEmbeddedDocuments("Item", itemData);
		}

		/* -------------------------------------------- */
		/*                  Context Menu                */
		/* -------------------------------------------- */

		/**
		 * Get context menu options for items in the sheet.
		 *
		 * @protected
		 * @returns {ContextMenuEntry[]} - The context menu options
		 */
		_getContextMenuOptions() {
			return [
				{
					name: "CURSEBORNE.Edit",
					icon: '<i class="fa-solid fa-edit"></i>',
					callback: (target) => this.constructor._onEditDocument.call(this, null, target),
				},
				{
					name: "CURSEBORNE.Duplicate",
					icon: '<i class="fa-solid fa-copy"></i>',
					callback: (target) => this.constructor._onDuplicateDocument.call(this, null, target),
				},
				{
					name: "CURSEBORNE.Delete",
					icon: '<i class="fa-solid fa-trash"></i>',
					callback: (target) =>
						this.constructor._onDeleteDocument.call(
							this,
							new PointerEvent("click", {
								view: window,
								bubbles: true,
								cancelable: true,
								shiftKey: event.shiftKey,
								clientX: event.clientX,
								clientY: event.clientY,
							}),
							target,
						),
				},
			];
		}

		/* -------------------------------------------- */
		/*                Document Actions              */
		/* -------------------------------------------- */

		/**
		 * Handle changing a Document's image.
		 *
		 * @this CurseborneItemSheet
		 * @param {PointerEvent} event   The originating click event
		 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
		 * @returns {Promise}
		 * @protected
		 */
		static async _onEditImage(event, target) {
			const attr = target.dataset.edit;
			const current = foundry.utils.getProperty(this.document, attr);

			if (this.isPlayMode) {
				return new foundry.applications.apps.ImagePopout({
					src: current,
					uuid: this.document.uuid,
					window: { title: this.document.name },
				}).render({
					force: true,
				});
			}

			const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};
			const fp = new foundry.applications.apps.FilePicker({
				current,
				type: "image",
				redirectToRoot: img ? [img] : [],
				callback: (path) => {
					this.document.update({ [attr]: path });
				},
				top: this.position.top + 40,
				left: this.position.left + 10,
			});
			return fp.browse();
		}
		/**
		 * @this {CurseborneDocumentSheet}}
		 * @param {PointerEvent} event
		 * @param {HTMLElement} target
		 */
		static async _onCreateDocument(event, target) {
			const { documentClass = "Item", action, ...data } = target.dataset ?? {};
			if (!documentClass) return console.error("No item type specified for creation");
			const docCls = getDocumentClass(documentClass);
			for (const [key, value] of Object.entries(data)) {
				if (key.startsWith("system")) {
					data.system ??= {};
					// Remove the "system" prefix from the key and un-capitalize it
					data.system[key.slice(6, 7).toLowerCase() + key.slice(7)] = value;
					delete data[key];
				}
			}
			const createData = {
				...foundry.utils.expandObject(data),
				name: docCls.defaultName({ type: data.type, parent: this.document }),
			};
			return docCls.create([createData], {
				parent: this.document,
				renderSheet: true,
			});
		}

		/**
		 * @this {CurseborneDocumentSheet}
		 * @param {PointerEvent} _event
		 * @param {HTMLElement} target
		 */
		static async _onEditDocument(_event, target) {
			const li = target.closest("[data-item-id], [data-effect-id]");
			const doc = await this.getDocument(li);
			return doc?.sheet.render(true);
		}

		/**
		 * @this {CurseborneDocumentSheet}
		 * @param {PointerEvent} _event
		 * @param {HTMLElement} target
		 */
		static async _onDuplicateDocument(_event, target) {
			const li = target.closest("[data-item-id], [data-effect-id]");
			const doc = await this.getDocument(li);
			return doc?.clone(
				{ name: game.i18n.format("DOCUMENT.CopyOf", { name: doc.name }) },
				{ save: true, addSource: true },
			);
		}

		/**
		 * @this {foundry.applications.api.DocumentSheetV2 & ItemListsSheet}
		 * @param {PointerEvent} event
		 * @param {HTMLElement} target
		 */
		static async _onDeleteDocument(event, target) {
			const li = target.closest("[data-item-id], [data-effect-id]");
			const doc = await this.getDocument(li);
			if (event.shiftKey) return doc?.delete();
			const { top, left, width } = li.getBoundingClientRect();
			return doc?.deleteDialog({
				position: {
					top,
					left: Math.clamp(left + width, left, window.innerWidth - 350),
				},
			});
		}

		/**
		 * @this {CurseborneDocumentSheet}
		 * @param {PointerEvent} event
		 * @param {HTMLElement} target
		 * @protected
		 */
		static _onOpenContextMenu(event, target) {
			event.preventDefault();
			event.stopPropagation();
			target.dispatchEvent(
				new Event("contextmenu", {
					view: window,
					bubbles: true,
					cancelable: true,
					clientX: event.clientX,
					clientY: event.clientY,
				}),
			);
		}

		// /**
		//  * @this {foundry.applications.api.DocumentSheetV2 & ItemListsSheet}
		//  * @param {PointerEvent} event
		//  * @param {HTMLElement} target
		//  */
		// static async _onUseDocument(event, target) {
		// 	const li = target.closest(".item");
		// 	const doc = await this.getDocument(li);
		// 	const options = { showDialog: !event.shiftKey };
		// 	return doc?.use(options);
		// }
		//
		// /**
		//  * @this {foundry.applications.api.DocumentSheetV2 & ItemListsSheet}
		//  * @param {PointerEvent} event
		//  * @param {HTMLElement} target
		//  * @returns {Promise<void>}
		//  */
		// static async _onRollDocument(event, target) {
		// 	const li = target.closest(".item");
		// 	const doc = await this.getDocument(li);
		// 	return doc?.roll({ event });
		// }

		/**
		 * Get the document associated with a target element
		 *
		 * @remarks This method is asynchronous because the document might be from a compendium, requiring a server request.
		 * @param {HTMLElement} target - The clicked target element
		 * @returns {Promise<mm3.documents.ItemMM3 | mm3.documents.ActiveEffectMM3 | null>} - The document instance
		 */
		async getDocument(target) {
			const { itemId, effectId, relativeId, uuid } = target.closest(
				"[data-item-id], [data-effect-id], [data-relative-id], [data-uuid]",
			).dataset;
			// UUIDs always guarantee an approach to a document, requiring no further lookup
			if (uuid) return foundry.utils.fromUuid(uuid);

			// Relative IDs are in relation to the root document into which others are embedded
			if (relativeId) {
				const doc = this.document.isEmbedded ? this.document.parent : this.document;
				return foundry.utils.fromUuid(relativeId, { relative: doc });
			}

			// Effect IDs are for ActiveEffects directly embedded in the sheet document
			if (effectId) return this.document.effects.get(effectId);

			// Item IDs are for embedded items for actors, or for sibling items in case of containers
			if (itemId) {
				if (this.document instanceof foundry.documents.Item)
					return this.document.getContainedItem(itemId);
				return this.document.items.get(itemId);
			}

			return null;
		}
	};
}
