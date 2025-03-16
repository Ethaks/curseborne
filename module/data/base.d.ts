export {};

declare module "./base.mjs" {
	/**
	 * The context object for rendering a document's embed element, e.g. for journals or tooltips.
	 */
	export interface EmbedContext extends Record<string, unknown> {
		doc: foundry.abstract.Document;
		system: CurseborneTypeDataModel;
		title: string;
		subtitle: string;
		img: string;

		/** Details related to the document in question. */
		details: {
			/** The label for the value. */
			label?: string;
			/** A simple value string to display. */
			value?: string;
			/** A string for an HTML element to be displayed instead of a simple value */
			valueElement?: string;
		}[];
	}
}
