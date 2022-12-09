import path from 'path';
import {fromPath} from '../../lib/spec-directory';

// Tests for methods on SpecDirectory that mutate its contents
describe('SpecDirectory mutations', () => {
  describe('writeFile', () => {
    it('replaces the contents of a virtual file', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      await dir.writeFile('output.css', 'NEW OUTPUT');
      expect(await dir.readFile('output.css')).toEqual('NEW OUTPUT');
    });

    it('writes contents to a file that does not exist yet', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      await dir.writeFile('output-libsass.css', 'MORE OUTPUT');
      expect(await dir.readFile('output-libsass.css')).toEqual('MORE OUTPUT');
      expect(await dir.listFiles()).toContain('output-libsass.css');
    });

    it('errors when passed in a multi-level path', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      await expect(() =>
        dir.removeFile('subdir/more-utils.scss')
      ).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('removes the contents of the virtual file', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      await dir.removeFile('output.css');
      expect(dir.hasFile('output.css')).toBeFalsy();
      expect(await dir.listFiles()).not.toContain('output.css');
    });

    it('no-ops when removing a file that does not exist', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      const files = await dir.listFiles();
      await dir.removeFile('does-not-exist');
      expect(await dir.listFiles()).toEqual(files);
    });

    it('errors when trying to remove a directory', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      await expect(() => dir.removeFile('subdir')).rejects.toThrow();
    });

    it('errors when trying to remove multi-level paths', async () => {
      const dir = await fromPath(
        path.resolve(__dirname, './fixtures/basic.hrx')
      );
      await expect(() =>
        dir.removeFile('subdir/more-utils.scss')
      ).rejects.toThrow();
    });
  });
});
