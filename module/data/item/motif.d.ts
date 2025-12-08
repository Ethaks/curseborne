export {};

declare module "./motif.mjs" {
	interface Motif {
		/** The identifier of the family with which this motif is associated. */
		family: string | null;
	}
}
