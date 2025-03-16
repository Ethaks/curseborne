export {};

declare module "./base.mjs" {
	export interface ItemTypeMetadata {
		/** The Item type this model represents. */
		type?: string;
		/** The HBS template used to render this item's details. */
		details?: string;
		/** Actor types this item cannot be embedded in. */
		invalidActorTypes?: string[];
	}
}
