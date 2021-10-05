/* eslint-disable no-process-exit */

import * as del from 'del';
import * as fs from 'fs';
import * as jest from 'jest';
import * as p from 'path';
import * as tmp from 'tmp';
import yargs from 'yargs/yargs';

import config from './jest.config';

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
      'The path to the sass/sass repo. Used to load type declarations. If ' +
      'the sass package being tested declares its own types, those are used ' +
      'instead, but this can provide type declarations for packages without ' +
      'them.',
  })
  .option('sassPackage', {
    type: 'string',
    description:
      'The path to the npm package that exports the Sass API. ' +
      'Used to test locally against different APIs without having to install ' +
      'and uninstall them.',
  })
  .option('help', {
    type: 'boolean',
    alias: 'h',
    hidden: true,
  });

const argv = args.argv;

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
del.sync(dir); // TODO(nweiz): Use fs.rmSync() when we drop support for Node 12
fs.mkdirSync(p.join(dir, 'node_modules', '@types', 'sass'), {recursive: true});

const configPath = p.join(dir, 'jest.config.json');
fs.writeFileSync(
  configPath,
  JSON.stringify({
    ...config,
    rootDir: p.resolve('.'),
    roots: ['<rootDir>/js-api-spec'],
  })
);

if (argv.sassPackage) {
  fs.symlinkSync(
    p.resolve(argv.sassPackage),
    p.join(dir, 'node_modules', 'sass')
  );
}

if (argv.sassSassRepo) {
  const specPath = p.join(argv.sassSassRepo, 'spec/js-api');
  const specIndex = p.join(specPath, 'index.d.ts');
  if (!fs.existsSync(specIndex)) {
    console.error(`${specIndex} doesn't exist!`);
    process.exit(1);
  }

  fs.symlinkSync(
    p.resolve(specPath),
    p.join(dir, 'node_modules', '@types', 'sass', 'js-api')
  );
  fs.writeFileSync(
    p.join(dir, 'node_modules', '@types', 'sass', 'package.json'),
    JSON.stringify({
      name: '@types/sass',
      types: 'js-api/index.d.ts',
    })
  );
}

del.sync(p.join('js-api-spec', 'node_modules'));
fs.symlinkSync(
  p.resolve(p.join(dir, 'node_modules')),
  p.join('js-api-spec', 'node_modules')
);

process.on('exit', () => {
  del.sync(p.join('js-api-spec', 'node_modules'));
  tmpObject.removeCallback();
});

jest.run([`--config=${configPath}`, ...(argv._ as string[])]);
