// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { DotsInput } from "@applications/components/dots-input.mjs";
import { Trick } from "@models/item/trick.mjs";

const { ApplicationV2 } = foundry.applications.api;

/**
 * A small dialog-like application containing an optional search field and a list of tricks.
 */
export class TrickSelector extends ApplicationV2 {
	/** @inheritDoc
	 * @type {Partial<foundry.applications.types.ApplicationConfiguration>}*/
	static DEFAULT_OPTIONS = {
		classes: ["curseborne", "dialog", "trick-selector"],
		window: {
			title: "CURSEBORNE.SelectTrick",
			contentClasses: ["standard-form"],
			minimizable: false,
			resizable: false,
		},
		position: { width: 275, height: 400 },
		actions: {
			chooseTrick: this.#onChooseTrick,
		},
	};

	/**
	 * The search filter for the trick list.
	 *
	 * @type {SearchFilter}
	 */
	#search = new foundry.applications.ux.SearchFilter({
		inputSelector: ".search",
		contentSelector: ".window-content",
		callback: this._onSearch.bind(this),
	});

	/* -------------------------------------------- */
	/*  Application Lifecycle                       */
	/* -------------------------------------------- */

	/** @inheritDoc */
	_onFirstRender(_context, _options) {
		this.element.addEventListener("keydown", (event) => {
			// Dismiss the dialog on escape
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopImmediatePropagation();
				this.close();
			}
		});
	}

	/** @inheritDoc */
	async _preRender(context, options) {
		await super._preRender(context, options);
		this._searchText = this.element?.querySelector(".search")?.value || "";
	}

	/** @inheritDoc */
	_onRender(context, options) {
		super._onRender(context, options);
		this.element.querySelector(".search")?.focus();
		this.#search.bind(this.element);
	}

	/** @inheritDoc */
	_onClose(options) {
		// Reject the promise if no trick was selected
		this.options.reject(new Error("No trick selected"));
		super._onClose(options);
	}

	/* -------------------------------------------- */
	/*  Event Listeners                             */
	/* -------------------------------------------- */

	/**
	 * Handle a search filter event, filtering the list of tricks.
	 *
	 * @param {Event} event
	 * @param {string} query
	 * @param {RegExp} rgx
	 * @param {HTMLElement} html - The list of tricks
	 */
	_onSearch(_event, _query, rgx, html) {
		// Iterate over each group of tricks, setting display none if the trick does not match the search;
		// If the group has no visible tricks, hide the group header; if the group matches the search, show the group
		// TODO: Consider better way to separate groups
		const groups = html.querySelectorAll("ul.tricks");
		for (const group of groups) {
			let groupMatches = false;
			let groupVisible = false;
			const groupName = group.querySelector(".header").textContent;
			if (rgx.test(groupName)) {
				groupVisible = groupMatches = true;
			}
			for (const trick of group.querySelectorAll(".trick")) {
				const name = trick.querySelector(".name").textContent;
				const matches = rgx.test(name);
				trick.style.display = matches || groupMatches ? "" : "none";
				if (matches) groupVisible = true;
			}
			group.style.display = groupVisible ? "" : "none";
		}
	}

	/**
	 * Confirm the selection of a trick and close the dialog.
	 *
	 * @this {TrickSelector}
	 * @param {Event} event
	 * @param {HTMLElement} target
	 */
	static async #onChooseTrick(_event, target) {
		const trickLi = target.closest(".trick");
		const { uuid, costType } = trickLi.dataset;
		const trick = await foundry.utils.fromUuid(uuid);
		const cost = target.querySelector("dots-input,input").value;
		if (costType === "variable" && cost === 0) return;
		if (costType === "variable" && (cost < trick.system.cost.min || cost > trick.system.cost.max))
			return;
		this.options.resolve({ uuid: trick.uuid, cost });
		this.close();
	}

	/**
	 * A static helper to create and await a TrickSelector dialog.
	 *
	 * @param {object} options - Options to pass to the TrickSelector constructor
	 * @param {string} [options.type=""] - The type of trick to filter by
	 * @param {Item[]} [options.choices] - The list of tricks to display
	 * @returns {Promise<{ uuid: string, cost: number }>}
	 */
	static async wait(options = {}) {
		const { resolve, reject, promise } = Promise.withResolvers();
		const selector = new this({
			...options,
			resolve,
			reject,
			promise,
		});
		await selector.render(true);
		return promise;
	}

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @inheritDoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Get the list of tricks to display
		let choices = this.options.choices || (await Trick.getAllTricks());
		if (this.options.filter) choices = choices.filter(this.options.filter);
		// Group tricks by type, sort by name
		game.i18n.sortObjects(choices, "name");
		/** @type foundry.utils.Collection<string, { type: string, label: string, choices: object[] }> */
		context.groups = Object.entries(curseborne.config.trickTypes).reduce(
			(acc, [type, { label }]) => {
				acc.set(type, { label, choices: [] });
				return acc;
			},
			new foundry.utils.Collection(),
		);
		for (const choice of choices) {
			const type = choice.system.type || "general";
			context.groups.get(type).choices.push(choice);
		}

		context.searchInput = this._searchText;
		context.needsSearch = choices.length > 10;

		return context;
	}

	/** @inheritDoc */
	async _renderHTML(context, _options) {
		const elements = [];

		if (context.needsSearch) {
			const searchInput = document.createElement("input");
			searchInput.classList.add("search");
			searchInput.type = "search";
			searchInput.placeholder = game.i18n.format("SIDEBAR.Search", {
				types: game.i18n.localize("CURSEBORNE.Tricks"),
			});
			searchInput.value = context.searchInput;
			elements.push(searchInput);
		}

		// Create wrapper div for all groups
		const content = document.createElement("div");
		content.classList.add("standard-form");
		elements.push(content);

		// Create one element for each group of tricks, containing a header and an ul of tricks
		for (const { type, label, choices } of context.groups) {
			if (choices.length === 0) continue;
			const trickList = document.createElement("ul");
			trickList.classList.add("tricks", "unlist");
			trickList.insertAdjacentHTML(
				"beforeend",
				`<li class="flexrow header" data-type="${type}">
							<span class="name">${game.i18n.localize(label)}</span>
						</li>`,
			);
			for (const trick of choices) {
				const trickType = trick.system.cost.type;
				const config = {
					value: trickType === "fixed" ? trick.system.cost.value : 0,
					max: trickType === "fixed" ? trick.system.cost.value : trick.system.cost.max,
					min: trickType === "fixed" ? trick.system.cost.value : trick.system.cost.min,
					type: "number",
					readonly: trick.system.cost.type === "fixed",
				};
				const tooltip = curseborne.tooltips.createPlaceholder({
					uuid: trick.uuid,
					tooltipDirection: foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.LEFT,
				});
				const dotsInput = curseborne.models.item.Trick.schema.fields.cost.toInput(config);
				dotsInput.classList.add("flexshrink", "align-right");
				trickList.insertAdjacentHTML(
					"beforeend",
					`<li class="trick flexrow" data-uuid="${trick.uuid}" data-action="chooseTrick" data-cost-type="${trick.system.cost.type}">
								<img src="${trick.img}" width="36" height="36" class="image flexshrink" loading="lazy">
								<span class="name" data-tooltip-direction="LEFT">${trick.name}</span>
								${dotsInput.outerHTML}
							</li>`,
				);
				trickList.querySelector(`.trick[data-uuid="${trick.uuid}"] span.name`).dataset.tooltip =
					tooltip;
			}
			content.appendChild(trickList);
		}

		return elements;
	}

	/** @inheritDoc */
	_replaceHTML(result, content, _options) {
		// Replace current content with new content
		content.innerHTML = "";
		for (const el of result) {
			content.appendChild(el);
		}
	}
}
