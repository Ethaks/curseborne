// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { gsap as _gsap } from "../foundry/public/scripts/greensock/esm/index";
import * as _curseborne from "./curseborne.mjs";
import * as _client from "@foundry/client/client.mjs";

import type { IdentifierModel } from "@models/fields/types";

declare global {
	var gsap: typeof _gsap & {
		to: typeof _gsap.core.Tween.to;
		from: typeof _gsap.core.Tween.from;
		fromTo: typeof _gsap.core.Tween.fromTo;
	};
	export import curseborne = _curseborne;
	export import foundry = _client;

	/** A string containing a document ID. */
	type ID = string;
	/* A string containing a document UUID. */
	type UUID = string;
	/** A string containing HTML content. */
	type HTMLString = string;
	/**
	 * A string containing a system identifier.
	 *
	 * @see {@linkcode IdentifierModel}
	 */
	type Identifier = string;
}
