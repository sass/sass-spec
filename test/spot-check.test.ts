import * as p from 'path';
import * as specDirectory from '../lib/spec-directory';

// Spot checks for common spec errors.

it('every directory contains or is contained by a test', async () => {
  // Verifies that `dir` either is a test, or that all its children are tests.
  async function verifyDirectory(
    dir: specDirectory.SpecDirectory
  ): Promise<void> {
    if (dir.isTestDir()) return;

    const subdirs = await dir.subdirs();
    if (subdirs.length === 0) {
      // Empty directories aren't recorded by Git, so we allow them.
      if ((await dir.listFiles()).length === 0) return;

      const path = p.relative(process.cwd(), dir.path);
      throw new Error(
        `Directory ${path} is neither a test, the child of a test, nor the ` +
          'parent of a test.'
      );
    } else {
      await Promise.all(subdirs.map(verifyDirectory));
    }
  }

  await verifyDirectory(await specDirectory.fromPath('spec'));
});
