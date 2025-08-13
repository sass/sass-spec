/*
 * The new --experimental-strip-types node option conflicts with `ts-node`.
 * This wrapper disables it if it's supported by the current node version.
 *
 * See: https://github.com/TypeStrong/ts-node/issues/2152
 *
 * TODO: switch to native typescript support once node<22 are dropped.
 */

import {execFileSync} from 'node:child_process';

try {
  execFileSync('node', ['--no-experimental-strip-types', '-e', ''], {
    shell: process.platform === 'win32',
    stdio: 'ignore',
  });

  if (process.env.NODE_OPTIONS === undefined) {
    process.env.NODE_OPTIONS = '--no-experimental-strip-types';
  } else {
    process.env.NODE_OPTIONS += ' --no-experimental-strip-types';
  }
} catch (_) {
  // ignore
}

try {
  execFileSync('ts-node', process.argv.slice(2), {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
} catch (error) {
  if (error.code) {
    throw error;
  } else {
    process.exitCode = error.status;
  }
}
