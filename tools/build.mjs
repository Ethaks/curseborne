import * as fs from "node:fs";
import path from "node:path";
import { build, write } from "bun";

import browserslist from "browserslist";
import * as lightningcss from "lightningcss";
import yargs from "yargs";

import { debounce } from "./utils.mjs";

const rootDir = path.normalize(`${import.meta.dir}/../`);
const fromRoot = (filepath) => path.resolve(rootDir, filepath);
const browserTargets = lightningcss.browserslistToTargets(
	browserslist("Chrome > 129, Firefox > 121"),
);

// Only handle commands if this script was executed directly
if (process.argv[1] === __filename) {
	yargs(process.argv.slice(2))
		.demandCommand(1, 1)
		.command({
			command: "build",
			describe: "Build the system's code and CSS",
			handler: async (argv) => {
				console.log("Building system...");
				const time = performance.now();
				await Promise.all([buildCode(argv.watch ? "development" : "release"), buildCss()]);
				console.log(`Built system in ${(performance.now() - time).toFixed(2)}ms`);

				if (argv.watch) {
					console.log("Watching for changes...");
					/**
					 * Debounced handler for file system events to prevent multiple builds in quick succession.
					 *
					 * @type {Function}
					 * @param {string} _event - The event type.
					 * @param {string} filename - The name of the file that triggered the event.
					 * @returns {Promise<void>}
					 */
					const debouncedHandleEvent = debounce(handleEvent, 300);
					fs.watch(fromRoot("templates"), { recursive: true }, debouncedHandleEvent);
					fs.watch(fromRoot("module"), { recursive: true }, debouncedHandleEvent);
					fs.watch(fromRoot("styles"), { recursive: true }, debouncedHandleEvent);
				}
			},
		})
		.option("watch", {
			alias: "w",
			type: "boolean",
			describe: "Watch for changes and rebuild automatically",
		})
		.parse();
}

/**
 * Handle file system events.
 *
 * @param {string} _event - The event type.
 * @param {string} filename - The name of the file that triggered the event.
 * @returns {Promise<void>}
 */
async function handleEvent(_event, filename) {
	const time = performance.now();
	const elapsed = () => (performance.now() - time).toFixed(2);

	// Remove ~ from filename
	filename = filename.replace("~", "");

	if (filename.endsWith(".mjs")) {
		try {
			await buildCode("development");
			console.log(`Rebuilt code in ${elapsed()}ms`);
		} catch (error) {
			console.error(error);
		}
	} else if (filename.endsWith(".css") && filename !== "curseborne.css") {
		try {
			await buildCss();
			console.log(`Rebuilt CSS in ${elapsed()}ms`);
		} catch (error) {
			console.error(error);
		}
	}
}

/**
 * Builds the system's JS using {@link Bun}.
 *
 * @returns {Promise<void>}
 */
async function buildCode(mode = "release") {
	const result = await build({
		entrypoints: [fromRoot("module/curseborne.mjs")],
		outdir: rootDir,
		sourcemap: "linked",
		external: ["gsap", "../../scripts/*"],
		minify: { syntax: mode === "release", whitespace: mode === "release" },
		target: "browser",
	});
	if (result.success === false) {
		throw new Error(result.logs.join("\n"));
	}
	return result;
}

/**
 * Builds the system's CSS using {@link lightningcss}.
 *
 * @returns {Promise<void>}
 */
async function buildCss() {
	const { code, map } = lightningcss.bundle({
		filename: "styles/curseborne.css",
		targets: browserTargets,
		minify: true,
		sourceMap: true,
	});
	return Promise.all([
		write(fromRoot("curseborne.css"), code),
		write(fromRoot("curseborne.css.map"), map),
	]);
}
