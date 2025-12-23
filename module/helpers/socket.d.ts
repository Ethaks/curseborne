// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

export {};
import { SocketHandler } from "./socket.mjs";

declare module "./socket.mjs" {
	interface BaseEvent {
		/** The string type of the event */
		type: string;
		/** The payload of the event */
		payload: Record<string, unknown>;
		/** The ID of the user that should handle the event */
		targetUser?: string;
		/** Whether this event should be handled by the active GM */
		activeGM?: boolean;
	}

	interface RequestEvent extends BaseEvent {
		/** The ID of a request that a response has to contain to resolve it. */
		request: string;
	}

	interface ResponseEvent extends RequestEvent {
		type: "response";
	}

	interface ReduceMomentum extends BaseEvent {
		type: "reduceMomentum";
		payload: { amount: number };
	}

	interface TestEvent extends BaseEvent {
		type: "test";
		payload: { foo: boolean };
	}

	interface TestRequest extends RequestEvent {
		type: "testRequest";
		payload: { foo: number };
	}

	type RequestHandler = (
		type: SocketEventType,
		payload: BaseEvent["payload"],
	) => Record<string, unknown>;

	type SocketEvent = ResponseEvent | TestEvent | TestRequest | ReduceMomentum;
	type SocketEventType = SocketEvent["type"];

	interface SocketHandler {
		constructor: typeof SocketHandler;
	}
}
