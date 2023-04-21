// Copyright 2021 Google Inc. Use of this source code is governed by an
// MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

/* Whether the tests are running in a browser context. */
export const isBrowser = !global.process;

/* When running in the browser, Jasmine is used as the test runner, not Jest.
 * The API is similar, but Jasmine requires explicit use of `expectAsync`.
 */
export const expectA = isBrowser ? expectAsync : expect;
