/**
 * scrape-engine — public API.
 *
 * A centralized adaptive scraping gateway wrapping the Python Scrapling
 * framework behind a thin TypeScript client. Import from here.
 */

export {
	checkScrapling,
	fetchPage,
	runScrapling,
	ScrapingBlockedError,
	ScrapingCliError,
	ScrapingDependencyError,
	ScrapingError,
	ScrapingTimeoutError,
	toTypedError,
} from "./scrapling-client";
export type { SpawnOutcome } from "./scrapling-client";

export {
	CookieSchema,
	ErrorKindSchema,
	ExtractedElementSchema,
	FetchErrorSchema,
	FetchRequestSchema,
	FetchResultSchema,
} from "./types";
export type {
	Cookie,
	ErrorKind,
	ExtractedElement,
	FetchError,
	FetchRequest,
	FetchRequestInput,
	FetchResult,
} from "./types";
