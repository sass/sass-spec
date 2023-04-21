/* Whether the tests are running in a browser context. */
export const isBrowser = !global.process;

/* When running in the browser, Jasmine is used as the test runner, not Jest.
 * The API is similar, but Jasmine requires explicit use of `expectAsync`.
 */
export const expectA = isBrowser ? expectAsync : expect;
