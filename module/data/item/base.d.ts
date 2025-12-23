// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

export {};

declare module "./base.mjs" {
	export interface ItemTypeMetadata {
		/** The Item type this model represents. */
		type?: string;
		/** The HBS template used to render this item's details; `false` if no details tab should be displayed. */
		details?: string | false;
		/** Actor types this item cannot be embedded in. */
		invalidActorTypes?: string[];
		/** A path to a handlebars template used to render embeds of this item. */
		embedTemplate?: string;
		/**
		 * The name of the property holding the collection of items of a specific type in an actor model;
		 * defaults to `${type}s` (e.g. "spells" for type "spell").
		 */
		identifierCollectionName?: string;
	}
}
