import { DotsInput } from "./dots-input.mjs";
import { ModifierSelectElement } from "./modifier-select.mjs";
import { SlideToggleElement } from "./slide-toggle.mjs";

// Register custom element
customElements.define(DotsInput.tagName, DotsInput);
customElements.define(SlideToggleElement.tagName, SlideToggleElement);
customElements.define(ModifierSelectElement.tagName, ModifierSelectElement);

export { DotsInput, SlideToggleElement, ModifierSelectElement };
