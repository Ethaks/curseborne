export {};
declare module "./adversary.mjs" {
	interface Adversary extends AdversaryCoreStats {
		drive: string;
		special: string;
	}

	interface AdversaryCoreStats {
		pools: Record<"primary" | "secondary" | "desperation", number>;
		enhancements: Set<{ action: string; value: number }>;
		defense: number;
		integrity: number;
		injuries: { value: number; max: number };
		armor: number;
		initiative: number;
	}

	type Pool = "primary" | "secondary" | "desperation";
}
