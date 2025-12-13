const TooltipManager = foundry.helpers.interaction.TooltipManager;

/**
 * A class managing the display of the system's expanded tooltips, making use of core's {@link TooltipManager}.
 *
 * Available at runtime as `curseborne.tooltips`.
 */
export class CurseborneTooltips {
	/**
	 * The observer watching for tooltip activation
	 *
	 * @type {MutationObserver}
	 */
	#observer;

	/**
	 * The tooltip element
	 *
	 * @type {HTMLElement}
	 */
	get tooltip() {
		return document.getElementById("tooltip");
	}

	/**
	 * Create mutation observer to watch for core Foundry tooltip activation
	 */
	observe() {
		this.#observer?.disconnect();
		this.#observer = new MutationObserver(this._onMutation.bind(this));
		this.#observer.observe(this.tooltip, {
			attributeFilter: ["class"],
			attributeOldValue: true,
		});
	}

	/**
	 * Handle mutation events on the tooltip element, determining whether the tooltip is being activated
	 *
	 * @param {MutationRecord[]} mutations
	 */
	_onMutation(mutations) {
		let isActive = false;
		const tooltip = this.tooltip;
		for (const { type, attributeName, oldValue } of mutations) {
			if (type === "attributes" && attributeName === "class") {
				const difference = new Set(tooltip.classList).difference(
					new Set(oldValue?.split(" ") ?? []),
				);
				if (difference.has("active")) isActive = true;
			}
		}
		if (isActive) this._onTooltipActivate();
	}

	/**
	 * Handle the activation of a tooltip element, possibly loading the system tooltip content
	 */
	async _onTooltipActivate() {
		const loading = this.tooltip.querySelector(".loading");
		if (!loading) return;

		const { uuid, ...options } = foundry.utils.expandObject(loading.dataset ?? {});
		if (loading?.dataset.uuid) {
			const doc = await foundry.utils.fromUuid(uuid);
			return this._onHoverDocument(doc, options);
		}
	}

	/**
	 * Embed a document when hovering over a tooltip element referencing a Document UUID
	 *
	 * @param {foundry.abstract.Document} doc
	 * @param {object} options
	 */
	async _onHoverDocument(doc, options) {
		const el = await doc.system?.toEmbed?.(options);
		if (!el) return;
		this.tooltip.innerHTML = el.outerHTML;
		this.tooltip.classList.add("curseborne", "curseborne-tooltip");

		this._positionItemTooltip(options.tooltipDirection);
	}

	/**
	 * Adjust the position of the tooltip element.
	 *
	 * @param {keyof typeof TooltipManager.TOOLTIP_DIRECTIONS} direction
	 */
	_positionItemTooltip(direction) {
		if (!direction) {
			direction = TooltipManager.TOOLTIP_DIRECTIONS.LEFT;
			game.tooltip._setAnchor(direction);
		}

		const pos = this.tooltip.getBoundingClientRect();
		const dirs = TooltipManager.TOOLTIP_DIRECTIONS;
		switch (direction) {
			case dirs.UP:
				if (pos.y - TooltipManager.TOOLTIP_MARGIN_PX <= 0) direction = dirs.DOWN;
				break;
			case dirs.DOWN:
				if (pos.y + this.tooltip.offsetHeight > window.innerHeight) direction = dirs.UP;
				break;
			case dirs.LEFT:
				if (pos.x - TooltipManager.TOOLTIP_MARGIN_PX <= 0) direction = dirs.RIGHT;
				break;
			case dirs.RIGHT:
				if (pos.x + this.tooltip.offsetWidth > window.innerWith) direction = dirs.LEFT;
				break;
		}

		game.tooltip._setAnchor(direction);
	}

	/**
	 * Creates a placeholder .loading element to be used in a data-tooltip,
	 * defering the actual tooltip content loading until the tooltip is activated.
	 *
	 * @param {object} data - Additional data placed in the placeholder element's dataset
	 * @param {string} [data.uuid] - The UUID of the Document to load when the tooltip is activated
	 * @param {keyof typeof TooltipManager.TOOLTIP_DIRECTIONS} [data.tooltipDirection] - The preferred tooltip direction
	 * @param {boolean} [data.descriptionOnly] - Whether to show only the description in the embed tooltip
	 */
	createPlaceholder(data) {
		const loading = document.createElement("section");
		loading.classList.add("loading");
		for (const [key, value] of Object.entries(foundry.utils.flattenObject(data))) {
			loading.dataset[key] = value;
		}
		loading.insertAdjacentHTML("beforeend", `<i class="fa-solid fa-spinner fa-spin"></i>`);
		return loading.outerHTML;
	}
}
