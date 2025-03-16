import { SYSTEM_ID, randomID } from "./utils.mjs";

/**
 * A utility class that handles socket communication for the MM3 system.
 */
export class SocketHandler {
	/**
	 * @param {string} [id] - The namespace string used for socket communication
	 */
	constructor(id) {
		/**
		 * The namespace string used for socket communication
		 *
		 * @satisfies {string}
		 */
		this.id = id || /** @type {const} */ (`system.${SYSTEM_ID}`);
	}

	/**
	 * Creates and initializes a new SocketHandler.
	 *
	 * @param {string} [id] - The namespace string used for socket communication
	 * @returns {SocketHandler}
	 */
	static initialize(id) {
		const handler = new this(id);
		handler.registerSocketHandler();
		return handler;
	}

	/**
	 * Registers the socket handler for this instance.
	 */
	registerSocketHandler() {
		console.info(`${SYSTEM_ID} | Registering socket handler for namespace: ${this.id}`);
		game.socket.on(
			this.id,
			/** @param {SocketEvent} data */
			async ({ type, request, activeGM, targetUser, payload } = {}, sourceUser = "") => {
				if (targetUser && targetUser !== game.user?.id) return;
				if (activeGM && !game.users.activeGM.isSelf) return;

				// Handle request resolving separately since it can be resolved internally
				if (type === "response") {
					this.#onResponse(request, payload);
					return;
				}

				// If the event is a request, the handler should return a payload to be used for the response
				if (request) {
					let response;
					try {
						response = await this.handleEvent({ type, payload });
					} catch (e) {
						response = { error: e.message };
					}
					return this.respond(request, response, { targetUser: sourceUser });
				}

				// Fire-and-forget handle the event
				return this.handleEvent({ type, payload });
			},
		);
	}

	/**
	 * Handles a socket event.
	 *
	 * @param {SocketEvent} event - The event to handle
	 * @returns {Promise<Record<string, unknown> | void>} A response payload if the event is a request, otherwise void
	 */
	async handleEvent(event) {
		const { type, payload } = event;
		switch (type) {
			// Test events used for Quench
			case "test": {
				return console.log(`${SYSTEM_ID} | Received test event`, payload.foo);
			}
			case "testRequest": {
				console.log(`${SYSTEM_ID} | Received test request`, payload);
				return { foo: payload.foo + 1 };
			}
			case "reduceMomentum": {
				const { amount } = payload;
				const momentum = game.settings.get("curseborne", "momentum");
				if (momentum < amount) {
					throw new Error("Not enough momentum to reduce");
				}
				await game.settings.set("curseborne", "momentum", momentum - amount);
				return { momentum: momentum - amount };
			}

			default: {
				return this.#handleUknownEvent(type, payload);
			}
		}
	}

	/**
	 * Handles an unknown socket event type.
	 *
	 * @param {SocketEventType} type - The event type
	 * @param {object} payload - The event payload
	 */
	#handleUknownEvent(type, payload) {
		console.warn(`${SYSTEM_ID} | Unknown socket event type: ${type}`);
		console.log(payload);
	}

	/**
	 * The time in milliseconds to wait for an acknowledgment from the server.
	 *
	 * @type {number}
	 */
	static ACK_TIMEOUT = 5000;

	/**
	 * Emits a socket message to the server and returns a Promise that resolves when the server acknowledges the message.
	 *
	 * @param {SocketEventType} type - The event type
	 * @param {object} payload - The event payload
	 * @param {object} [options] - Additional options
	 * @param {boolean} [options.selfEmit] - Whether to run the callback as if this client also received the message
	 * @param {number} [options.timeout] - The time in milliseconds to wait for a response; if falsy, no timeout is set
	 * @param {string} [options.targetUser] - The ID of the user who should handle the event
	 * @param {boolean} [options.activeGM] - Whether the active GM should handle the event
	 * @param {string} [options.request] - The ID of the request, if the event is a request
	 * @returns {Promise}
	 */
	async emit(
		type,
		payload,
		{
			selfEmit = false,
			timeout = this.constructor.ACK_TIMEOUT,
			targetUser,
			activeGM = false,
			request,
		} = {},
	) {
		const { promise, resolve, reject } = Promise.withResolvers();

		if (targetUser && !game.users.has(targetUser))
			throw new Error(`${SYSTEM_ID} | User ${targetUser} not found`);

		if (timeout) {
			setTimeout(() => {
				reject(new Error(`Event ${type} timed out`));
			}, timeout);
		}

		console.info(`${SYSTEM_ID} | Emitting socket event: ${type}`);
		game.socket.emit(this.id, { type, payload, activeGM, targetUser, request }, {}, (ack) => {
			resolve(ack);

			// Run callback as if this client also received the message
			if (selfEmit) {
				this.handleEvent(type, payload);
			}
		});
		return promise;
	}

	/**
	 * A Map of pending request made by this client.
	 *
	 * @type {Map<string, { resolve: Function, reject: Function, timeout: Timer }>}
	 */
	#requests = new Map();

	/**
	 * Emits a socket event and returns a Promise that is resolved when the receiving client handled the event and sent a response.
	 *
	 * @param {SocketEventType} type - The event type
	 * @param {object} payload - The event payload
	 * @param {object} [options] - Additional options
	 * @param {number} [options.timeout] - The time in milliseconds to wait for a response; if falsy, no timeout is set
	 * @param {string} [options.targetUser] - The ID of the user who should handle the event
	 * @param {boolean} [options.activeGM] - Whether the active GM should handle the event
	 * @returns {Promise}
	 */
	async request(
		type,
		payload,
		{ timeout = this.constructor.ACK_TIMEOUT * 10, targetUser, activeGM = false } = {},
	) {
		const { promise, resolve, reject } = Promise.withResolvers();
		const requestId = randomID({ collection: this.#requests });

		this.#requests.set(requestId, { resolve, reject, timeout });
		console.info(`${SYSTEM_ID} | Waiting for response to socket event: ${type}`);

		if (timeout) {
			this.#requests.get(requestId).timeout = setTimeout(() => {
				this.#onResponse(requestId, {
					error: new Error(`Request ${type} timed out`),
				});
			}, timeout);
		}

		// Await the initial emit and server ack, then return request promise
		await this.emit(type, payload, {
			targetUser,
			activeGM,
			request: requestId,
		});
		return promise;
	}

	/**
	 * Respond to a pending request from another client with a payload.
	 *
	 * @param {string} requestId - The ID of the reqeust to be resolved
	 * @param {object} payload - The response payload
	 * @returns {void}
	 */
	respond(requestId, payload) {
		return this.emit("response", payload, { request: requestId });
	}

	/**
	 * Resolves a pending request with the given payload.
	 *
	 * @param {string} id - The request ID
	 * @param {object | Error} payload - The response payload
	 */
	#onResponse(id, payload) {
		const { resolve, reject, timeout } = this.#requests.get(id) ?? {};

		if (!resolve) {
			const error = new Error(`Received response for unknown request ID: ${id}`);
			throw error;
		}
		if (payload.error) {
			if (payload.error instanceof Error) reject(payload.error);
			else reject(new Error(payload.error));
		}

		console.info(`${SYSTEM_ID} | Resolving request with ID: ${id}`, payload);
		resolve(payload);
		clearTimeout(timeout);
		this.#requests.delete(id);
	}
}
