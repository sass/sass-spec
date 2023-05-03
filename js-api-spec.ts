/* eslint-disable no-process-exit */

import * as del from 'del';
import * as fs from 'fs-extra';
import * as jest from 'jest';
import * as p from 'path';
import * as tmp from 'tmp';
import {config, Server} from 'karma';
import yargs from 'yargs/yargs';

import jestConfig from './jest.config';

declare module 'jest' {
  function run(args: string[]): never;
}

const args = yargs(process.argv.slice(2))
  .parserConfiguration({'unknown-options-as-args': true})
  .help(false)
  .version(false)
  .option('sassSassRepo', {
    type: 'string',
    description:
      'The path to the sass/sass repo. Used to load type declarations.',
    demand: true,
  })
  .option('sassPackage', {
    type: 'string',
    description: 'The path to the npm package that exports the Sass API.',
    demand: true,
  })
  .option('browser', {
    type: 'boolean',
    description: 'Run the tests in a ChromeHeadless browser context.',
  })
  .option('help', {
    type: 'boolean',
    alias: 'h',
    hidden: true,
  });

const argv = args.parseSync();

if (argv.help) {
  args.showHelp();
  console.error('');
  jest.run(['--help']);
}

// Set up a temp directory that overrides the default Jest configuration and
// adds node_modules that depend on the given sassSassRepo and sassPackage.
const tmpObject = tmp.dirSync({
  template: 'js-api-spec.XXXXXX',
  unsafeCleanup: true,
});
const dir = tmpObject.name;
// TODO(nweiz): Use fs.rmSync() when we drop support for Node 12
del.sync(dir, {force: true});
const sassPackagePath = p.join(dir, 'node_modules', 'sass');
fs.mkdirSync(sassPackagePath, {recursive: true});

// We want to use the type information from --sassSassRepo even if --sassPackage
// is written in TypeScript, because the specs may test behavior that's not yet
// implemented in --sassPackage and we don't want that to cause a compile error.
// We accomplish this by creating a JavaScript package named "sass" that
// requires and re-exports --sassPackage, and using the type annotations from
// --sassSassRepo as that package's annotations.
const packageRequire = argv.browser
  ? p.resolve(argv.sassPackage, 'sass.default.js')
  : p.resolve(argv.sassPackage);
fs.writeFileSync(
  `${sassPackagePath}/index.js`,
  `module.exports = require(${JSON.stringify(packageRequire)});`
);

// Load the APIs from the doc folder, since it uses plain .d.ts files instead of
// literate .d.ts.md files. The language repo's CI ensures the two remain in
// sync.
const specPath = p.join(argv.sassSassRepo, 'js-api-doc');
const specIndex = p.join(specPath, 'index.d.ts');
if (!fs.existsSync(specIndex)) {
  console.error(`${specIndex} doesn't exist!`);
  process.exit(1);
}

// Copy rather than symlinking so we don't end up using the Sass repo's
// `node_modules` directory.
fs.copySync(p.resolve(specPath), p.join(sassPackagePath, 'js-api'));

fs.writeFileSync(
  p.join(sassPackagePath, 'package.json'),
  JSON.stringify({
    name: 'sass',
    types: 'js-api/index.d.ts',
  })
);

del.sync(p.join('js-api-spec', 'node_modules'));
fs.symlinkSync(
  p.resolve(p.join(dir, 'node_modules')),
  p.join('js-api-spec', 'node_modules')
);

if (argv.browser) {
  fs.mkdirSync(p.resolve(argv.sassPackage, 'node_modules'));
  fs.symlinkSync(
    p.resolve(__dirname, 'node_modules', 'immutable'),
    p.resolve(argv.sassPackage, 'node_modules', 'immutable')
  );
}

process.on('exit', () => {
  del.sync(p.join('js-api-spec', 'node_modules'));
  if (argv.browser) {
    del.sync(p.resolve(argv.sassPackage, 'node_modules'), {force: true});
  }
  tmpObject.removeCallback();
});

if (argv.browser) {
  const karmaConfig = config.parseConfig(
    p.resolve(__dirname, 'karma.config.js'),
    {port: 9876},
    {throwErrors: true}
  );
  const server = new Server(karmaConfig, exitCode => {
    console.log('Karma has exited with ' + exitCode);
    process.exit(exitCode);
  });
  server.start();
} else {
  const configPath = p.join(dir, 'jest.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      ...jestConfig,
      rootDir: p.resolve('.'),
      roots: ['<rootDir>/js-api-spec'],
      setupFilesAfterEnv: [
        ...(jestConfig.setupFilesAfterEnv ?? []),
        './js-api-spec/setup.ts',
      ],
    })
  );
  jest.run([`--config=${configPath}`, ...(argv._ as string[])]);
}
