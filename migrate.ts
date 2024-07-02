// Script to run the Sass migrator over a spec directory.
//
// Usage:
// npm run migrate -- directory-to-migrate <migrator> [migrator-options]

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import {fromRoot} from './lib/spec-directory';

async function migrate() {
  const dirToMigrate = process.argv[2];
  const migratorCommand = process.argv[3];
  const migratorArgs = process.argv.slice(4);
  const root = path.resolve(process.cwd(), 'spec');
  const rootDir = await fromRoot('spec');

  await rootDir.forEachTest(
    async testDir => {
      const files = (await testDir.listFiles()).filter(
        file => file.endsWith('.scss') || file.endsWith('.sass')
      );
      console.log(testDir.relPath());
      const output = child_process.execFileSync(
        path.join(
          __dirname,
          'node_modules',
          'sass-migrator',
          'sass-migrator.js'
        ),
        [migratorCommand, `--load-path=${root}`, ...migratorArgs, ...files],
        {cwd: testDir.path, encoding: 'utf8'}
      );
      if (output.length > 0) console.log(output);
      // Actually write the migrator's changes to the virtual directory's cache.
      for (const file of files) {
        await testDir.writeFile(
          file,
          await fs.promises.readFile(path.join(testDir.path, file), {
            encoding: 'utf8',
          })
        );
      }
    },
    [dirToMigrate]
  );
}

migrate();
