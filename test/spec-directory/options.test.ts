import {fromContents} from '../../lib-js/spec-directory';

describe('SpecDirectory options', () => {
  it('works in the basic case', async () => {
    const dir = await fromContents(
      `
<===> options.yml
:todo:
  - dart-sass
:ignore_for:
  - libsass
:precision: 3
`.trimStart()
    );
    const options = await dir.options();
    expect(options.getMode('dart-sass')).toEqual('todo');
    expect(options.getMode('libsass')).toEqual('ignore');
    expect(options.precision()).toEqual(3);
  });

  it('overrides parent options correctly', async () => {
    const dir = await fromContents(
      `
<===> options.yml
:todo:
  - dart-sass
:ignore_for:
  - libsass
:precision: 3
<===> child/options.yml
:todo:
  - sass-mock
:ignore_for:
  - dart-sass
:warning_todo:
  - libsass
:precision: 4
`.trimStart()
    );
    const childDir = await dir.atPath('child');
    const options = await childDir.options();
    expect(options.getMode('sass-mock')).toEqual('todo');
    expect(options.getMode('dart-sass')).toEqual('ignore');
    expect(options.isWarningTodo('libsass')).toEqual(true);
    expect(options.precision()).toEqual(4);
  });

  it('overrides more than one layer deep', async () => {
    const dir = await fromContents(
      `
<===> options.yml
:precision: 3
<===> deep/child/options.yml
:precision: 4
`.trimStart()
    );
    const noOptsChild = await dir.atPath('deep');
    expect((await noOptsChild.options()).precision()).toEqual(3);
    const deepChild = await dir.atPath('deep/child');
    expect((await deepChild.options()).precision()).toEqual(4);
  });
});
