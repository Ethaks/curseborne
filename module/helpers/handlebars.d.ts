import type { FormGroupConfig } from "../../foundry/common/data/_types.mjs";
export {};

declare module "./handlebars.mjs" {
	export interface CurseFormGroupConfig extends FormGroupConfig {
		/** Whether the sheet is in edit mode */
		isEditMode?: boolean;
		/** A source object used to fill in the value when editable */
		source?: object;
		/** A model used to fill in the value when not editable */
		model?: foundry.abstract.DataModel;
		/** Whether the field should be editable (i.e. in edit mode or meant to be edited even in play mode) */
		editable: boolean;
		/** Whether the input should be disabled */
		disabled?: boolean;

		dataset?: object;

		labelColon?: boolean;
		span?: boolean;
	}
}
