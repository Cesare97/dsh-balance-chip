/**
 * Host half of the balance chip.
 *
 * The sidebar row is entirely a browser-side plugin (lib/client.js). This file
 * exists so the package can be mounted as a Loader entry: the Web boot graph is
 * composed from enabled Loader rows, so a package whose browser half nobody
 * mounts is never served to the page.
 *
 * It registers nothing model-facing and starts no work.
 */

/** No Host services are required. */
export const inject = []

/** The Host half is inert; the browser half does everything. */
export function apply() {}
