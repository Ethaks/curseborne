// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/**
 * A custom HTML element that represents a checkbox-like input that is displayed as a slide toggle.
 * @fires change
 */
export class SlideToggleElement extends foundry.applications.elements.AbstractFormInputElement {
	/** @inheritDoc */
	constructor() {
		super();
		this._internals.role = "switch";
		this._internals.ariaChecked = this.hasAttribute("checked") ? "true" : "false";
	}

	static tagName = "slide-toggle";

	/* -------------------------------------------- */

	/**
	 * Whether the slide toggle is toggled on.
	 * @type {boolean}
	 */
	get checked() {
		return this.hasAttribute("checked");
	}

	set checked(value) {
		if (typeof value !== "boolean")
			throw new Error("Slide toggle checked state must be a boolean.");
		this.toggleAttribute("checked", value);
		this._internals.ariaChecked = `${value}`;
	}

	/**
	 * Masquerade as a checkbox input.
	 * @type {string}
	 */
	get type() {
		return "checkbox";
	}

	/**
	 * Create the constituent components of this element.
	 * @returns {HTMLElement[]}
	 * @protected
	 */
	_buildElements() {
		const track = document.createElement("div");
		track.classList.add("slide-toggle-track");
		const thumb = document.createElement("div");
		thumb.classList.add("slide-toggle-thumb");
		track.append(thumb);
		return [track];
	}

	/**
	 * Guard against adding event listeners more than once.
	 * @type {boolean}
	 */
	#listenersAdded = false;

	/**
	 * Whether the slide toggle is currently transitioning.
	 * @type {boolean}
	 */
	#isTransitioning = false;

	/**
	 * Activate event listeners.
	 * @protected
	 */
	_activateListeners() {
		if (this.#listenersAdded) return;
		this.addEventListener("click", () => this._onToggle());
		this.#listenersAdded = true;
	}

	/**
	 * Handle toggling the control.
	 * @param {PointerEvent} event  The triggering event.
	 * @protected
	 */
	async _onToggle(_event) {
		// if (this.#isTransitioning) return;
		// this.#isTransitioning = true;

		this.checked = !this.checked;
		this.dispatchEvent(new Event("change"));
		// this.addEventListener(
		// 	"transitionend",
		// 	() => {
		// 		this.#isTransitioning = false;
		// 		this.dispatchEvent(new Event("change"));
		// 	},
		// 	{ once: true },
		// );
	}
}
