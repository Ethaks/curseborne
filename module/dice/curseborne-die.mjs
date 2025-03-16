/**
 * Registers a double success modifier for {@link foundry.dice.terms.Die} that counts results over a certain threshold
 * as two successes.
 */
export function registerModifiers() {
	// Register the countDouble function
	CONFIG.Dice.terms.d.MODIFIERS.cd = countDouble;
}

/**
 * A modifier that makes the dice it is applied to count for two `cs` successes if the result is over a certain threshold.
 *
 * @this {foundry.dice.terms.Die}
 * @param {string} modifier - The modifier as it is parsed from the formula
 * @returns {false | void} False if the modifier was unmatched
 */
function countDouble(modifier) {
	// If there is no cound success modifier, counting double does nothing
	if (!this.modifiers.some((m) => m.startsWith("cs"))) return false;
	// Match the modifier `cd` followed by the threshold, which can be a <, <=, >, >=, =, or nothing (defaulting to >=)
	const rgx = /cd([<>=]{0,2})(\d+)*/;
	const match = modifier.match(rgx);
	if (!match) return false;
	let [comparison, target] = match.slice(1);
	target = Number.parseInt(target) || this.faces;

	for (const result of this.results) {
		if (foundry.dice.terms.DiceTerm.compareResult(result.result, comparison, target)) {
			result.count = 2;
		}
	}
}
