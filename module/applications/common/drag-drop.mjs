/**
 * A mixin to add drag and drop functionality to an Application.
 *
 * @param {typeof foundry.applications.api.ApplicationV2} Base
 */
export function DragDropMixin(Base) {
	const DragDrop = foundry.applications.ux.DragDrop;

	return class DragDropApplication extends Base {
		constructor(...args) {
			super(...args);
			this.#dragDrop = this.#createDragDropHandlers();
		}

		/* -------------------------------------------- */
		/*  Internal Drag and Drop setup                */
		/* -------------------------------------------- */

		/**
		 * The DragDrop handler for this Application; private since inheriting classes should use its config.
		 *
		 * @type {DragDrop[]}
		 */
		#dragDrop;

		/**
		 * DragDrop instances for this Application.
		 */
		get dragDrop() {
			return this.#dragDrop;
		}

		/**
		 * Create drag-and-drop workflow handlers for this Application
		 * @returns {DragDrop[]}     An array of DragDrop handlers
		 * @private
		 */
		#createDragDropHandlers() {
			return this.options.dragDrop.map((d) => {
				d.permissions = {
					dragstart: this._canDragStart.bind(this),
					drop: this._canDragDrop.bind(this),
				};
				d.callbacks = {
					dragstart: this._onDragStart.bind(this),
					dragover: this._onDragOver.bind(this),
					drop: this._onDrop.bind(this),
				};
				return new DragDrop(d);
			});
		}

		/**
		 * @type {InstanceType<Base>["_onRender"]}
		 * @protected
		 * @inheritDoc
		 */
		_onRender(context, options) {
			for (const dragDrop of this.#dragDrop) {
				dragDrop.bind(this.element);
			}
		}

		/* -------------------------------------------- */
		/*  Drag and Drop API                           */
		/* -------------------------------------------- */

		/**
		 * Define whether a user is able to begin a dragstart workflow for a given drag selector
		 * @param {string} selector       The candidate HTML selector for dragging
		 * @returns {boolean}             Can the current user drag this selector?
		 * @protected
		 */
		_canDragStart(selector) {
			return this.isEditable;
		}

		/**
		 * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
		 * @param {string} selector       The candidate HTML selector for the drop target
		 * @returns {boolean}             Can the current user drop on this selector?
		 * @protected
		 */
		_canDragDrop(selector) {
			return this.isEditable;
		}

		/**
		 * Callback actions which occur at the beginning of a drag start workflow.
		 * @param {DragEvent} event       The originating DragEvent
		 * @protected
		 */
		async _onDragStart(event) {
			const docRow = event.currentTarget.closest("[data-item-id]");
			if ("link" in event.target.dataset) return;

			// Chained operation
			const dragData = (await this.getDocument(docRow))?.toDragData();

			if (!dragData) return;

			// Set data transfer
			event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		}

		/**
		 * Callback actions which occur when a dragged element is over a drop target.
		 * @param {DragEvent} event       The originating DragEvent
		 * @protected
		 */
		_onDragOver(event) {}

		/**
		 * Callback actions which occur when a dragged element is dropped on a target.
		 * @param {DragEvent} event       The originating DragEvent
		 * @protected
		 */
		async _onDrop(event) {
			const data = foundry.applications.ux.TextEditor.getDragEventData(event);
			const doc = this.document;
			const allowed = Hooks.call(`drop${this.constructor.name}Data`, doc, this, data);
			if (allowed === false) return;

			// Handle different data types
			switch (data.type) {
				case "ActiveEffect":
					return this._onDropActiveEffect(event, data);
				case "Actor":
					return this._onDropActor(event, data);
				case "Item":
					return this._onDropItem(event, data);
				case "Folder":
					return this._onDropFolder(event, data);
			}
		}

		/* -------------------------------------------- */
		/*  Active Effect Drag and Drop                 */
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
			if (!this.document.isOwner || !effect) return false;
			if (effect.target === this.document) return this._onSortActiveEffect(event, effect);
			return aeCls.create(effect, { parent: this.document });
		}

		/**
		 * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
		 *
		 * @param {DragEvent} event
		 * @param {ActiveEffect} effect
		 */
		async _onSortActiveEffect(event, effect) {
			/** @type {HTMLElement} */
			const dropTarget = event.target.closest("[data-effect-id]");
			if (!dropTarget) return;
			const target = this._getEmbeddedDocument(dropTarget);

			// Don't sort on yourself
			if (effect.uuid === target.uuid) return;

			// Identify sibling items based on adjacent HTML elements
			const siblings = [];
			for (const el of dropTarget.parentElement.children) {
				const siblingId = el.dataset.effectId;
				const parentId = el.dataset.parentId;
				if (siblingId && parentId && (siblingId !== effect.id || parentId !== effect.parent.id))
					siblings.push(this._getEmbeddedDocument(el));
			}

			// Perform the sort
			const sortUpdates = foundry.utils.performIntegerSort(effect, {
				target,
				siblings,
			});

			// Split the updates up by parent document
			const directUpdates = [];

			const grandchildUpdateData = sortUpdates.reduce((items, u) => {
				const parentId = u.target.parent.id;
				const update = { _id: u.target.id, ...u.update };
				if (parentId === this.document.id) {
					directUpdates.push(update);
					return items;
				}
				if (items[parentId]) items[parentId].push(update);
				else items[parentId] = [update];
				return items;
			}, {});

			// Effects-on-items updates
			for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
				await this.document.items.get(itemId).updateEmbeddedDocuments("ActiveEffect", updates);
			}

			// Update on the main actor
			return this.document.updateEmbeddedDocuments("ActiveEffect", directUpdates);
		}

		/* -------------------------------------------- */
		/*  Actor Drag and Drop                         */
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
			// No other common handling for all documents
			if (!this.document.isOwner) return false;
		}

		/* -------------------------------------------- */
		/*  Item Drag and Drop                          */
		/* -------------------------------------------- */

		/**
		 * Handle dropping of an item reference or item data onto an Actor Sheet
		 * @param {DragEvent} event            The concluding DragEvent which contains drop data
		 * @param {object} data                The data transfer extracted from the event
		 * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
		 * @protected
		 */
		async _onDropItem(event, data) {
			if (!this.document.isOwner) return false;
		}
	};
}
