import {fromContents} from '../../lib/spec-directory';
import {getExpectedResult} from '../../lib/test-case/expected';

describe('getExpectedResult()', () => {
  describe('output', () => {
    const expected = {
      isSuccess: true,
      output: 'OUTPUT',
      warning: undefined,
      error: undefined,
    };

    async function expectOutput(contents: string): Promise<void> {
      const dir = await fromContents(contents.trimStart());
      const result = await getExpectedResult(dir, 'sass-mock');
      expect(result).toEqual(expected);
    }

    it('returns contents of `output.css` when there are no overrides', async () => {
      await expectOutput(`
<===> output.css
OUTPUT`);
    });

    it('returns `output-[impl].css` contents when there is an impl-specific override', async () => {
      await expectOutput(`
<===> output.css
FAILURE
<===> output-sass-mock.css
OUTPUT`);
    });

    it('returns original `output.css` contents when another impl is overridden', async () => {
      await expectOutput(`
<===> output.css
OUTPUT
<===> output-dart-sass.css
FAILURE`);
    });
  });

  describe('error', () => {
    const expected = {
      isSuccess: false,
      output: undefined,
      error: 'ERROR',
      warning: undefined,
    };
    async function expectError(contents: string): Promise<void> {
      const dir = await fromContents(contents.trimStart());
      const result = await getExpectedResult(dir, 'sass-mock');
      expect(result).toEqual(expected);
    }

    it('returns contents of `error` when there are no overrides', async () => {
      await expectError(`
<===> error
ERROR`);
    });

    it('returns contents of `error-[impl]` when impl-specific error file is specified', async () => {
      await expectError(`
<===> error
FAILURE
<===> error-sass-mock
ERROR`);
    });

    it('returns the base error when an impl-specific error file is defined for another impl', async () => {
      await expectError(`
<===> error
ERROR
<===> error-dart-sass
FAILURE`);
    });

    it('returns impl-specific error file when a base output file anda an impl-specific error file are defined', async () => {
      await expectError(`
<===> output.css
FAILURE
<===> error-sass-mock
ERROR`);
    });
  });

  describe('warning', () => {
    const expected = {
      isSuccess: true,
      output: 'OUTPUT',
      error: undefined,
      warning: 'WARNING',
    };
    async function expectWarning(contents: string): Promise<void> {
      const dir = await fromContents(contents.trimStart());
      const result = await getExpectedResult(dir, 'sass-mock');
      expect(result).toEqual(expected);
    }
    it('returns the contents of `warning` when a warning file is defined', async () => {
      await expectWarning(`
<===> output.css
OUTPUT
<===> warning
WARNING`);
    });

    it('returns overridden warning message if `warning-[impl]` file is defined', async () => {
      await expectWarning(`
<===> output.css
OUTPUT
<===> warning
FAILURE
<===> warning-sass-mock
WARNING`);
    });

    it('returns overridden warning message if `warning-[impl]` file defined without a base `warning` file', async () => {
      await expectWarning(`
<===> output.css
OUTPUT
<===> warning-sass-mock
WARNING`);
    });
  });

  describe('thrown errors', () => {
    async function expectToThrow(contents: string): Promise<void> {
      const dir = await fromContents(contents.trimStart());
      expect(async () => {
        await getExpectedResult(dir, 'sass-mock');
      }).rejects.toThrow();
    }

    it('throws if no output or error files are detected', async () => {
      await expectToThrow(`
<===> README.md
no outputs or errors here
      `);
    });

    it('throws if both output and error files are detected', async () => {
      await expectToThrow(`
<===> output.css
OUTPUT
<===> error
ERROR
      `);

      await expectToThrow(`
<===> output-sass-mock.css
OUTPUT
<===> error-sass-mock
ERROR
      `);
    });

    // TODO re-enable this when existing specs are fixed
    it.skip('throws if both an error and warning file are detected', async () => {
      await expectToThrow(`
<===> warning
WARNING
<===> error
ERROR
      `);

      await expectToThrow(`
<===> warning-sass-mock
WARNING
<===> error-sass-mock
ERROR
      `);
    });
  });
});
