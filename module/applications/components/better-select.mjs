import { randomID, SYSTEM_ID } from "@helpers/utils.mjs";

/** @import { RollModifier } from "@dice/data.mjs"; */
/** @import { FormInputConfig } from "@common/data/_types.mjs"; */

/**
 * A (multi-)select UI element for selecting values from a pre-defined list, or adding free-form values.
 * The element is thus built with distinct configurations:
 *   - Free-form input: if enabled, the user can input custom values; otherwise, only predefined choices are selectable.
 *   - Multi-select: if enabled, the user can select multiple values; otherwise, only one value can be selected.
 *
 * @extends {foundry.applications.elements.AbstractFormInputElement<Record<string, RollModifier>>}
 */
export class BetterMultiSelectElement extends foundry.applications.elements
	.AbstractFormInputElement {
	constructor() {
		super();
		this._initialize();
	}

	/** @inheritDoc */
	static tagName = "curse-select";

	/** @inheritDoc */
	_value = {};

	/**
	 * The button element to add a new modifier to the list.
	 * @type {HTMLButtonElement}
	 */
	#addButton;

	/**
	 * The input element for custom modifier values.
	 * @type {HTMLInputElement}
	 */
	#input;

	/**
	 * The list element which contains all selected modifiers.
	 * @type {HTMLUListElement}
	 */
	#list;

	/**
	 * The dropdown element which contains available choices for selection.
	 * @type {HTMLDivElement}
	 */
	#dropdown;

	/**
	 * Whether to use deletion key syntax for the form value to indicate deletion of an element.
	 * @type {boolean}
	 */
	#useDeletionKeys = false;

	/**
	 * Predefined <option> and <optgroup> elements which are available for selection
	 * @type {(HTMLOptionElement | HTMLOptGroupElement)[]}
	 */
	_options;

	/**
	 * An object which maps option values to their corresponding label text
	 * @type {Record<string, string>}
	 * @protected
	 */
	_choices = {};

	/**
	 * The type of modifier being selected, either "enhancement" or "complication".
	 * @type {"enhancement" | "complication"}
	 */
	get type() {
		return this.getAttribute("type") || "enhancement";
	}
	set type(value) {
		// TODO: Validate type
		this.setAttribute("type", value);
	}

	/**
	 * Initialize the element's value based on the provided attributes.
	 *
	 * @protected
	 */
	_initialize() {
		// The serialised JSON record of selected modifiers
		const initial = this.getAttribute("value") || this.innerText || "";
		try {
			const parsed = initial ? JSON.parse(initial) : {};
			const values = Array.isArray(parsed) ? parsed : [...Object.values(parsed)];
			for (const value of values) {
				if (!value) continue;
				this._value[value.id] = value;
			}
		} catch (error) {
			console.error("Invalid JSON", error);
		} finally {
			this.innerText = "";
			this.removeAttribute("value");
		}

		// Predefined choices
		const choices = this.getAttribute("choices") || "";
		try {
			this._choices = choices ? JSON.parse(choices) : {};
		} catch (error) {
			console.error("Invalid JSON", error);
		} finally {
			this.removeAttribute("choices");
		}

		this.#useDeletionKeys = this.hasAttribute("useDeletionKeys");
	}

	/** @inheritDoc */
	_buildElements() {
		// Element list
		this.#list = document.createElement("div");
		this.#list.classList.add("tags", "input-element-tags");

		// Input element
		this.#input = document.createElement("input");
		this.#input.type = "text";
		this.#input.placeholder = game.i18n.format(""); // TODO: Add placeholder text according to type

		// Add button
		this.#addButton = document.createElement("button");
		this.#addButton.type = "button";
		this.#addButton.className = "icon fa-solid fa-plus";
		this.#addButton.dataset.tooltip = game.i18n.format(""); // TODO: Add tooltip text according to type
		this.#addButton.setAttribute("aria-label", this.#addButton.dataset.tooltip);

		return [this.#list, this.#input, this.#addButton];
	}

	/** @inheritDoc */
	_refresh() {
		if (!this.#list) return;
		const elements = Object.entries(this._value)
			.filter(([_, v]) => !!v)
			.sort((a, b) => this.constructor.sortElements(a, b))
			.map(([key, value]) => this.constructor.renderValue(key, value, this.editable));
		this.#list.replaceChildren(...elements);

		// Adjust dropdown position
		if (this.#dropdown) {
			const inputRect = this.#input.getBoundingClientRect();
			this.#dropdown.style.top = `${inputRect.bottom}px`;
			this.#dropdown.style.left = `${inputRect.left}px`;
			this.#dropdown.style.width = `${inputRect.width}px`;
			// this.#dropdown.showPopover();
		}
	}

	/**
	 * Sort choices/elements.
	 *
	 * @param {[string, object]} a - The first element to compare
	 * @param {[string, object]} b - The second element to compare
	 * @returns {number} - The sorting order
	 * @protected
	 */
	static sortElements([aKey, aValue], [bKey, bValue]) {
		const aNumber = Number.isNumeric(aValue.value) ? Number(aValue.value) : undefined;
		const bNumber = Number.isNumeric(bValue.value) ? Number(bValue.value) : undefined;
		if (aNumber !== undefined && bNumber !== undefined) return aNumber - bNumber;
		if (aValue.label && bValue.label) return aValue.label.localeCompare(bValue.label);
		return aKey.localeCompare(bKey);
	}

	/**
	 * Create an HTML element for a single pill.
	 *
	 * @param {string} key - The modifier key
	 * @param {RollModifier} value - The modifier value
	 * @param {boolean} editable - Is the modifier editable?
	 * @returns {HTMLUListElement}
	 */
	static renderValue(key, value, editable = true) {
		return foundry.utils.parseHTML(`<li
			class="tag"
			data-id="${key}"
			${value.hint ? `data-tooltip="${value.hint}"` : ""}
		>
			${value ? `<span class="tag-value">${value.value}</span>` : ""}
			${value.label ? `<span class="tag-label">${value.label}</span>` : ""}
			${
				editable
					? `<button type="button" class="remove unbutton" data-tooltip aria-label="${game.i18n.localize("CURSEBORNE.Delete")}">
							<i class="fa-solid fa-times" inert></i>
					   </button>`
					: ""
			}
		</li>`);
	}

	/**
	 * Create an HTML element for a single choice in the dropdown list.
	 * Each choice is a list element showing the label of the choice on the left, and the value on the right.
	 * An optional stacking icon is displayed before the value if the choice is stacking.
	 *
	 * @param {string} key - The choice key
	 * @param {RollModifier} choice - The choice value
	 * @returns {HTMLLIElement}
	 */
	static renderChoice(id, choice) {
		const { label, value, hint } = choice;

		const li = foundry.utils.parseHTML(`
			<li
				class="dropdown-item"
				data-id="${id}"
				${hint ? `data-tooltip="${hint}"` : ""}
			>
				<div class="dropdown-item-label">
				${label}
				</div>
				<div class="dropdown-item-value">
					${value}
				</div>
				${hint ? `<span class="dropdown-item-hint">${hint}</span>` : ""}
			</li>
		`);

		for (const [key, value] of Object.entries(foundry.utils.flattenObject(choice))) {
			li.dataset[key] = value;
		}

		return li;
	}

	/** @inheritDoc */
	_activateListeners() {
		this.#addButton.addEventListener("click", () => this._tryAdd(this.#input.value));
		this.#list.addEventListener("click", this.#onClickValue.bind(this));
		// When entering the input field, create a dropdown element of predefined choices (if any)
		this.#input.addEventListener("focus", this.#onFocusInput.bind(this));
		this.#input.addEventListener("keyup", this.#onKeyUp.bind(this));
		this.#input.addEventListener("change", (event) => {
			// Prevent submitOnChange behaviour when editing the input
			event.preventDefault();
			event.stopImmediatePropagation();
		});
		this.#input.addEventListener("blur", this.#onBlurInput.bind(this));
	}

	/**
	 * Handle a click event on a modifier pill.
	 * If the click event originated from a remove button, delete the modifier from the list.
	 *
	 * @param {MouseEvent} event - The originating click event
	 * @private
	 */
	#onClickValue(event) {
		if (!event.target.classList.contains("remove")) return;
		const tag = event.target.closest(".tag");
		// Handle deletion according to options:
		//  - If the form data is used to update a data model, use deletion key syntax
		//  - If the form data is used as-is, delete the key directly
		delete this._value[tag.dataset.id];
		if (this.#useDeletionKeys) this._value[`-=${tag.dataset.id}`] = null;
		this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
		this._refresh();
	}

	/**
	 * Handle a keydown event on the input field.
	 *
	 * @param {KeyboardEvent} event - The originating keydown event
	 * @private
	 */
	#onKeyUp(event) {
		const firstItem = this.#dropdown?.querySelector(".dropdown-item");

		// TODO: Change Tab handling to selecting elements with arrow keys
		if (firstItem && event.key === "Tab") {
			event.preventDefault(); // Prevent default tab behavior
			const id = firstItem.dataset.id;
			this._value[id] = this._choices[id];
			this.#dropdown.remove();
			this.#input.value = ""; // Clear the input
			this._refresh();
		} else if (event.key === "Enter") {
			// Try to add the currently entered input as new modifier
			event.preventDefault();
			this._tryAdd(this.#input.value.trim());
		} else {
			// Update dropdown items on any other key press.
			this.#updateDropdownItems();
		}
	}

	#onBlurInput(_event) {
		// Remove dropdown when input loses focus (after delay to allow clicking choices)
		setTimeout(() => {
			if (this.#dropdown) {
				this.#dropdown.remove();
				this.#dropdown = null;
			}
		}, 100);
	}

	#onFocusInput() {
		if (!this.#dropdown) {
			this.#createDropdown();
		} else {
			this.#updateDropdownItems();
		}
	}

	/**
	 * Create a dropdown list of available choices based on the current input value.
	 *
	 * @private
	 */
	#createDropdown() {
		if (this.#dropdown) return; // Avoid duplicate dropdowns.

		// Create and configure the dropdown container.
		this.#dropdown = document.createElement("div");
		this.#dropdown.classList.add("dropdown");
		this.#dropdown.popover = "manual";

		// Set the position and size of the dropdown.
		const inputRect = this.#input.getBoundingClientRect();
		this.#dropdown.style.position = "absolute";
		this.#dropdown.style.top = `${inputRect.bottom}px`;
		this.#dropdown.style.left = `${inputRect.left}px`;
		this.#dropdown.style.width = `${inputRect.width}px`;
		this.#dropdown.style.margin = "0";

		// Create a list for dropdown items.
		const ul = document.createElement("ul");
		ul.classList.add("dropdown-list", "unlist");
		this.#dropdown.appendChild(ul);

		// Populate the dropdown with unselected choices.
		this.#updateDropdownItems();
		if (ul.children.length === 0) return;

		// Append the dropdown to the parent element and show it.
		this.appendChild(this.#dropdown);
		this.#dropdown.showPopover();

		// Handle input blur and dropdown interactions.
		this.#dropdown.addEventListener("mousedown", this.#onClickDropdownItem.bind(this));
		ul.addEventListener("click", this.#onClickDropdownItem.bind(this));
	}

	/** @inheritDoc */
	_onClick(event) {
		// Forward click to input element
		if (event.target !== this.#input) {
			this.#input.focus();
		}
	}

	/**
	 * Update the dropdown list of available choices based on the current input value.
	 *
	 * @private
	 */
	#updateDropdownItems() {
		if (!this.#dropdown) return;

		const ul = this.#dropdown.querySelector("ul");
		ul.innerHTML = ""; // Clear existing items.

		// Filter available choices to only those not selected and whose label, hint, or value includes the filter
		const availableChoices = Object.entries(this._choices)
			.filter(([id, choice]) => {
				// Filter out choices which are already selected
				if (Object.keys(this._value).includes(id)) return false;
				return this._applyChoiceFilter(this.#input.value.toLowerCase().trim(), id, choice);
			})
			.sort((a, b) => this.constructor.sortElements(a, b));

		// Add matching choices to the dropdown, limited to 5
		for (const [id, value] of availableChoices) {
			ul.appendChild(this.constructor.renderChoice(id, value));
		}
	}

	/**
	 * Filter the available choices based on the current input value.
	 *
	 * @param {string} input - The current input value
	 * @param {string} id - The choice ID to check
	 * @param {object} choice - The choice object to check
	 * @returns {boolean} - Is the choice valid?
	 */
	_applyChoiceFilter(input, id, choice) {
		return (
			choice.label.toLowerCase().includes(input.toLowerCase().trim()) ||
			`${choice.value}`.toLowerCase().includes(input.toLowerCase().trim())
		);
	}

	/**
	 * Handle a click/mousedown event on a dropdown item.
	 * If an item is clicked, add it to the list of selected modifiers.
	 *
	 * @param {MouseEvent} event - The originating click event
	 * @private
	 * @returns {void}
	 */
	#onClickDropdownItem(event) {
		const choice = event.target.closest(".dropdown-item");
		if (!choice) return;

		this.#input.value = ""; // Clear the input to avoid doubled values
		this._value[choice.dataset.id] = this._choices[choice.dataset.id];
		if (this.#dropdown) {
			this.#dropdown.remove();
			this.#dropdown = null;
		}
		this.value = this._value;
		this._refresh();
	}

	/**
	 * Add a new ad-hoc element.
	 *
	 * @param {string} value - The modifier value to add
	 */
	_tryAdd(value) {
		value = this._parseAddValue(value);
		const id = value.id || randomID({ collection: Object.keys(this._value) });

		this._value[id] = {
			id,
			...value,
		};

		if (this.#dropdown) this.#updateDropdownItems();
		this.#input.value = "";
		this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
		this._refresh();
		this.#input.focus();
	}

	_parseAddValue(value) {
		return { value };
	}

	/* -------------------------------------------- */
	/* Form Handling                                */
	/* -------------------------------------------- */
	/** @inheritDoc */
	_getValue() {
		// If the value is requested due to a form submit while the input still contains something,
		// attempt to add the current input value as a new modifier so that it is not lost.
		if (this.#input.value.trim().length) {
			try {
				const value = this._parseAddValue(this.#input.value.trim());
				const id = value.id || randomID({ collection: Object.keys(this._value) });
				this._value[id] = {
					id,
					...value,
				};
			} catch (error) {
				console.error(`${SYSTEM_ID} | ${this.constructor.name} failed to parse input value`, error);
			}
		}
		return this._value;
	}

	/** @inheritDoc */
	_setValue(value) {
		this._value = {};
		if (!value) return;
		for (const [key, element] of Object.entries(value)) {
			this._value[key] = element;
		}
	}

	/**
	 * Create a HTMLModifierSelectElement using provided configuration data.
	 *
	 * @param {FormInputConfig} config - The input field configuration data
	 * @returns {BetterMultiSelectElement} - A constructed HTMLModifierSelectElement
	 */
	static create(config) {
		/** @type {BetterMultiSelectElement} */
		const el = document.createElement(this.tagName);
		el.name = config.name;
		el.type = config.type;

		// Values
		if (config.value) el.setAttribute("value", JSON.stringify(config.value));
		if (config.choices) el.setAttribute("choices", JSON.stringify(config.choices));

		if (!("useDeletionKeys" in config)) console.debug("useDeletionKeys not in config", config);
		if (config.useDeletionKeys) el.toggleAttribute("useDeletionKeys");

		foundry.applications.fields.setInputAttributes(el, config);

		return el;
	}
}
