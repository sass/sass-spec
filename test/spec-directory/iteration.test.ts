import path from 'path';
import {SpecDirectory, fromRoot} from '../../lib/spec-directory';

describe('SpecDirectory iteration', () => {
  describe('forEachTest', () => {
    let dir: SpecDirectory;
    beforeEach(async () => {
      dir = await fromRoot(path.resolve(__dirname, './fixtures/iterate'));
    });

    it('iterates through all test directories', async () => {
      const testCases: string[] = [];
      await dir.forEachTest(async subdir => {
        testCases.push(subdir.relPath());
      });
      expect(testCases).toContain(path.join('iterate', 'physical'));
      expect(testCases).toContain(path.join('iterate', 'archive', 'scss'));
      // counts directories with input.sass as valid
      expect(testCases).toContain(path.join('iterate', 'archive', 'indented'));
      // does not iterate through directories without an input file
      expect(testCases).not.toContain(
        path.join('iterate', 'archive', 'no-input'),
      );
    });

    it('works when passed in a single path argument', async () => {
      const testCases: string[] = [];
      await dir.forEachTest(
        async subdir => {
          testCases.push(subdir.relPath());
        },
        ['iterate/archive'],
      );
      expect(testCases).not.toContain(path.join('iterate', 'physical'));
      expect(testCases).toContain(path.join('iterate', 'archive', 'scss'));
      expect(testCases).toContain(path.join('iterate', 'archive', 'indented'));
    });

    it('works when passed in multiple path arguments', async () => {
      const testCases: string[] = [];
      await dir.forEachTest(
        async subdir => {
          testCases.push(subdir.relPath());
        },
        ['iterate/physical', 'iterate/archive/scss'],
      );
      expect(testCases).toContain(path.join('iterate', 'physical'));
      expect(testCases).toContain(path.join('iterate', 'archive', 'scss'));
      expect(testCases).not.toContain(
        path.join('iterate', 'archive', 'indented'),
      );
    });

    it('works when one path is under another', async () => {
      const testCases: string[] = [];
      await dir.forEachTest(
        async subdir => {
          testCases.push(subdir.relPath());
        },
        ['iterate/archive', 'iterate/archive/scss'],
      );
      expect(testCases).not.toContain(path.join('iterate', 'physical'));
      expect(testCases).toContain(path.join('iterate', 'archive', 'scss'));
      expect(testCases).toContain(path.join('iterate', 'archive', 'indented'));
    });

    it('throws when an unknown path is passed', async () => {
      const testCases: string[] = [];
      await expect(
        dir.forEachTest(
          async subdir => {
            testCases.push(subdir.relPath());
          },
          ['iterate/archive', 'iterate/unknown'],
        ),
      ).rejects.toThrow("Path iterate/unknown doesn't exist");
    });

    describe('supports a trailing slash', () => {
      describe('in fromRoot()', () => {
        it('for a physical directory', async () => {
          dir = await fromRoot(
            path.resolve(__dirname, './fixtures/iterate/physical/'),
          );

          const testCases: string[] = [];
          await dir.forEachTest(async subdir => {
            testCases.push(subdir.relPath());
          });
          expect(testCases).toEqual(['physical']);
        });

        it('for an HRX archive', async () => {
          dir = await fromRoot(
            path.resolve(__dirname, './fixtures/iterate/archive/'),
          );

          const testCases: string[] = [];
          await dir.forEachTest(async subdir => {
            testCases.push(subdir.relPath());
          });
          expect(testCases).toEqual([
            path.join('archive', 'scss'),
            path.join('archive', 'indented'),
          ]);
        });
      });

      describe('in only parameter()', () => {
        it('for a physical directory', async () => {
          const testCases: string[] = [];
          await dir.forEachTest(
            async subdir => {
              testCases.push(subdir.relPath());
            },
            ['iterate/physical/'],
          );
          expect(testCases).toEqual([path.join('iterate', 'physical')]);
        });

        it('for an HRX archive', async () => {
          const testCases: string[] = [];
          await dir.forEachTest(
            async subdir => {
              testCases.push(subdir.relPath());
            },
            ['iterate/archive/'],
          );
          expect(testCases).toEqual([
            path.join('iterate', 'archive', 'scss'),
            path.join('iterate', 'archive', 'indented'),
          ]);
        });
      });
    });

    describe('supports a .hrx extension', () => {
      describe('in fromRoot()', () => {
        it('for a physical directory', async () => {
          dir = await fromRoot(
            path.resolve(__dirname, './fixtures/iterate/physical.hrx'),
          );

          const testCases: string[] = [];
          await dir.forEachTest(async subdir => {
            testCases.push(subdir.relPath());
          });
          expect(testCases).toEqual(['physical']);
        });

        it('for an HRX archive', async () => {
          dir = await fromRoot(
            path.resolve(__dirname, './fixtures/iterate/archive.hrx'),
          );

          const testCases: string[] = [];
          await dir.forEachTest(async subdir => {
            testCases.push(subdir.relPath());
          });
          expect(testCases).toEqual([
            path.join('archive', 'scss'),
            path.join('archive', 'indented'),
          ]);
        });
      });

      describe('in only parameter()', () => {
        it('for a physical directory', async () => {
          const testCases: string[] = [];
          await dir.forEachTest(
            async subdir => {
              testCases.push(subdir.relPath());
            },
            ['iterate/physical.hrx'],
          );
          expect(testCases).toEqual([path.join('iterate', 'physical')]);
        });

        it('for an HRX archive', async () => {
          const testCases: string[] = [];
          await dir.forEachTest(
            async subdir => {
              testCases.push(subdir.relPath());
            },
            ['iterate/archive.hrx'],
          );
          expect(testCases).toEqual([
            path.join('iterate', 'archive', 'scss'),
            path.join('iterate', 'archive', 'indented'),
          ]);
        });
      });
    });
  });
});
