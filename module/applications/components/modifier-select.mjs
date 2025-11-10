import { BetterMultiSelectElement } from "./better-select.mjs";

/** @import { RollModifier } from "@dice/data.mjs"; */

/**
 * A multi-select UI element for selecting modifiers (complications/enhancements) from a pre-defined list,
 * or adding ad-hoc modifiers with a custom label and value.
 *
 * The list of selected modifiers is displayed as a list of pill buttons using a format of `value [stacking] | label [remove]`,
 * where `value` is the value to be added to the roll (in string form to be resolved, can be an @-reference),
 * `stacking` is an optional FA icon to indicate that the modifier is stacking, `label` is the human-readable label,
 * and `remove` is a button to remove the modifier from the list.
 *
 */
export class ModifierSelectElement extends BetterMultiSelectElement {
	/** @inheritDoc */
	static tagName = "modifier-select";

	/**
	 * The type of modifier being selected, either "enhancement" or "complication".
	 * @type {"enhancement" | "complication" | "difficulty"}
	 */
	get type() {
		return this.getAttribute("type") || "enhancement";
	}
	set type(value) {
		// TODO: Validate type
		this.setAttribute("type", value);
	}

	/** @inheritDoc */
	static renderValue(key, value, editable = true) {
		const li = super.renderValue(key, value, editable);

		// Stacking icon
		if (value.stacking) {
			const iconStacking = document.createElement("i");
			iconStacking.classList.add("fa-solid", "fa-layer-group", "modifier-stacking");
			li.querySelector(".tag-value").appendChild(iconStacking);
		}

		if (value.enabled === false) {
			li.classList.add("inactive");
		}

		return li;
	}

	/** @inheritDoc */
	static sortElements([aKey, aValue], [bKey, bValue]) {
		// First non-stacking, then stacking; then by value
		if (aValue.stacking && !bValue.stacking) return 1;
		if (!aValue.stacking && bValue.stacking) return -1;
		return super.sortElements([aKey, aValue], [bKey, bValue]);
	}

	/** @inheritDoc */
	static renderChoice(id, value) {
		const li = super.renderChoice(id, value);

		// Stacking icon
		if (value.stacking) {
			const iconStacking = document.createElement("i");
			iconStacking.classList.add("fa-solid", "fa-layer-group", "dropdown-item-stacking");
			li.querySelector(".dropdown-item-value").prepend(iconStacking);
		}

		return li;
	}

	/** @inheritDoc */
	_applyChoiceFilter(input, id, choice) {
		if (`${choice.hint}`.toLowerCase().includes(input.toLowerCase().trim())) return true;
		return super._applyChoiceFilter(input, id, choice);
	}

	/** @inheritDoc */
	_parseAddValue(value) {
		const { stacking, number, label } = value.match(
			/(?<stacking>\+)?(?<number>\d+)\s*(?<label>.*)/,
		).groups;
		return super._parseAddValue({
			value: number,
			stacking: stacking === "+",
			label: label.replace(/^\[|\]$/g, ""),
		});
	}
}
