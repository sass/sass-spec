import {fromContents} from '../../lib/spec-directory';
import {toHrx} from '../../lib/spec-directory/hrx';

describe('toHrx', () => {
  async function expectHrx(
    input: string,
    expected: string = input
  ): Promise<void> {
    input = input.trimLeft();
    expected = expected.trimLeft();
    const dir = await fromContents(input);
    expect(await toHrx(dir)).toEqual(expected);
  }

  it('writes contents of a normal directory in alphabetical order', async () => {
    const input = `
<===> apple
apple
<===> coconut
coconut
<===> banana
banana`;
    await expectHrx(input);
  });

  it('writes the correct number of trailing newlines', async () => {
    const input = `
<===> apple
apple

<===> coconut
coconut


<===> banana
banana


`;
    await expectHrx(input);
  });

  it('splits nested directories into sections', async () => {
    const input = `
<===> mushrooms/morel
morel
<===> banana
banana
<===> vegetables/potato
potato
<===> apple
apple
<===> mushrooms/shiitake
shiitake
<===> vegetables/carrot
carrot
`;
    const expected = `
<===> banana
banana
<===> apple
apple
<===>
================================================================================
<===> mushrooms/morel
morel
<===> mushrooms/shiitake
shiitake
<===>
================================================================================
<===> vegetables/potato
potato
<===> vegetables/carrot
carrot
`;
    await expectHrx(input, expected);
  });

  it("doesn't print extra sections on deeply nested directories", async () => {
    const input = `
<===> a/b/c/README.md
this is a deep file
`;
    await expectHrx(input);
  });

  it('overwrites test directories in style-guide order', async () => {
    const input = `
<===> output.css
OUTPUT

<===> _util.scss
UTIL

<===> output-dart-sass.css
IMPL OUTPUT

<===> warning-libsass
IMPL WARNING

<===> subdir/input.scss
MORE UTIL

<===> options.yml
OPTIONS

<===> input.scss
INPUT

<===> warning
WARNING
`;
    const expected = `
<===> options.yml
OPTIONS

<===> input.scss
INPUT

<===> _util.scss
UTIL

<===> subdir/input.scss
MORE UTIL

<===> output.css
OUTPUT

<===> output-dart-sass.css
IMPL OUTPUT

<===> warning
WARNING

<===> warning-libsass
IMPL WARNING
`;
    await expectHrx(input, expected);
  });

  it('processes multiple test directories in a single archive correctly', async () => {
    const input = `
<===> test-1/input.scss
INPUT

<===> test-2/error
ERROR

<===> test-2/input.scss
INPUT

<===> test-1/output.css
OUTPUT
`;
    const expected = `
<===> test-1/input.scss
INPUT

<===> test-1/output.css
OUTPUT

<===>
================================================================================
<===> test-2/input.scss
INPUT

<===> test-2/error
ERROR
`;
    await expectHrx(input, expected);
  });
});
