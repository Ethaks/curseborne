/**
 * An element displaying number, consisting of multiple dots/pips that are filled in to the present value,
 * and empty otherwise.
 * A number of pips can be marked disabled, making them unselectable.
 * If a minimum is given, lower pips will be disabled and displayed in a smaller size.
 */
export class DotsInput extends foundry.applications.elements.AbstractFormInputElement {
	constructor(...args) {
		super(...args);
		this.#max = this.hasAttribute("max") ? Number.parseInt(this.getAttribute("max")) : 1;
		this.#min = this.hasAttribute("min") ? Number.parseInt(this.getAttribute("min")) : 0;

		// Parse disabled; can be a range (e.g. "1-3") or a list (e.g. "1,3,5"), or a single number (e.g. "2").
		// For range and lists, these indices are disabled; for a number, that number of pips from the end are disabled.
		const disabledPips = this.dataset.disabledPips;
		if (disabledPips) {
			if (disabledPips.includes("-")) {
				const [start, end] = disabledPips.split("-").map(Number);
				this.#disabledPips = Array.from({ length: end - start + 1 }, (_, i) => start + i);
			} else if (disabledPips.includes(",")) {
				this.#disabledPips = disabledPips.split(",").map(Number);
			} else {
				this.#disabledPips = Array.from({ length: Number(disabledPips) }, (_, i) => i);
			}
		}

		this._setValue(Number(this.getAttribute("value")) || 0);
	}

	static tagName = "dots-input";

	/**
	 * The maximum value of pips.
	 *
	 * @type {number}
	 */
	#max;

	/**
	 * The minimum value; pips below this value are disabled.
	 *
	 * @type {number}
	 */
	#min;

	/**
	 * The number of pips that are disabled.
	 *
	 * @type {number[]}
	 */
	#disabledPips = [];

	/**
	 * An array of button elements representing the pips.
	 *
	 * @type {HTMLButtonElement[]}
	 */
	#pips;

	/** @inheritDoc */
	_buildElements() {
		this.#pips = Array.from({ length: this.#max }, (_, i) => {
			const pip = document.createElement("button");
			pip.classList.add("pip");
			// If below minimum, or if disabled through disabledPips, use a smaller dot and mark as disabled.
			if (i < this.#min || this.#disabledPips.includes(i)) {
				pip.classList.add("small", "disabled");
			}
			pip.classList.toggle("filled", i < this._getValue());
			pip.dataset.index = i;
			this._applyInputAttributes(pip);
			return pip;
		});

		this.setAttribute("aria-role", "slider");

		return [...this.#pips];
	}

	/** @inheritDoc */
	_refresh() {
		if (!this.#pips?.length) return;
		for (let i = 0; i < this.#pips.length; i++) {
			const pip = this.#pips[i];
			pip.classList.toggle("filled", i < this._getValue());
			pip.classList.toggle("empty", i >= this._getValue());
			pip.classList.toggle("disabled", i < this.#disabledPips);
		}
	}

	/** @ineritDoc */
	_activateListeners() {
		for (const pip of this.#pips) {
			pip.addEventListener("click", this._onClickPip.bind(this));
		}
		// Attach hover listeners to highlight pips with a lower index than the hovered pip
		// Rate-limit the event listener to prevent it from firing too often.
		if (!this.editable) return;
		const onMouseOver = foundry.utils.throttle(this._onMouseOverPip.bind(this), 100);
		this.addEventListener("mouseover", onMouseOver);
		this.addEventListener("mousemove", onMouseOver);
		const onMouseLeave = foundry.utils.debounce(this._onMouseLeavePip.bind(this), 200);
		this.addEventListener("mouseleave", onMouseLeave);
	}

	/** @inheritDoc */
	_applyInputAttributes(input) {
		super._applyInputAttributes(input);
		if (input instanceof HTMLButtonElement) {
			if (!this.editable) {
				input.classList.add("disabled");
			}
		}
	}

	/**
	 * Handle a pip being clicked.
	 *
	 * @param {MouseEvent} event - The originating click event.
	 */
	_onClickPip(event) {
		event.preventDefault();
		event.stopImmediatePropagation();

		if (!this.editable) return;

		// Raw index of the pip clicked.
		const index = Number.parseInt(event.currentTarget.dataset.index);
		const newValue = index + 1;
		const currentValue = this._getValue();

		// If there is a min and the value is below it, or if the pip is disabled, do nothing.
		if (newValue < this.#min || this.#disabledPips.includes(index)) return;

		// If the value is 1 and the same as the current value, set the value to 0
		if (newValue === 1 && newValue === currentValue) {
			this._setValue(0);
		} else {
			// Otherwise, set the value to the clicked value.
			this._setValue(newValue);
		}
		this.value = this._getValue();
	}

	/**
	 * Use pip highlighting to indicate changes, i.e. change their filled state.
	 *
	 * @param {MouseEvent} event - The originating mouseover event.
	 */
	_onMouseOverPip(event) {
		const pip = event.target.closest(".pip");
		if (!pip) return;
		const index = Number.parseInt(pip.dataset.index);
		const currentValue = this._getValue();
		const wouldBeZero = index === 0 && currentValue === 1;
		for (let i = 0; i < this.#pips.length; i++) {
			const pip = this.#pips[i];
			// Highlight pips up to the new value; if the value would be zero, highlight all pips;
			// if the aimed-for value is lower than the curent value, highlight all pips up to the current value.
			pip.classList.toggle("highlight", i <= index || wouldBeZero || i < currentValue);
			// For pips with a higher value than hovered one, add the empty class to preview the change.
			pip.classList.toggle("empty", i > index && i < currentValue);
		}
	}

	/**
	 * Reset the highlighting of pips when leaving the element.
	 *
	 * @param {MouseEvent} _event - The originating mouseleave event.
	 */
	_onMouseLeavePip(_event) {
		for (let i = 0; i < this.#pips.length; i++) {
			const pip = this.#pips[i];
			pip.classList.remove("highlight");
			pip.classList.remove("empty");
			pip.classList.toggle("filled", i < this._getValue());
		}
	}

	static create(config) {
		const input = document.createElement(this.tagName);
		input.name = config.name;
		for (const attr of ["value", "max", "disabled", "readonly"]) {
			if (config[attr] !== undefined) {
				if (typeof config[attr] === "boolean") {
					if (config[attr]) input.setAttribute(attr, "");
				} else {
					input.setAttribute(attr, config[attr]);
				}
			}
		}
		if (config.disabledPips !== undefined) {
			input.dataset.disabledPips = config.disabledPips;
		}
		return input;
	}
}
