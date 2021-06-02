import {TestCaseArg, optionsFor} from '../../lib-js/interactor';
import {SassResult, TestResult} from '../../lib-js/test-case/util';

interface MockTestCaseArg {
  impl?: string;
  actual?: SassResult;
  result?: TestResult;
}

function mockTestCase(args: MockTestCaseArg = {}): TestCaseArg {
  return {
    impl: args.impl ?? 'sass-mock',
    actual: () => args.actual ?? {isSuccess: true, output: ''},
    result: () => args.result ?? {type: 'pass'},
  };
}

describe('Interactor options', () => {
  async function expectOption(
    key: string,
    args: MockTestCaseArg,
    valid = true
  ): Promise<void> {
    const options = optionsFor(mockTestCase(args));
    const keys = options.map(o => o.key);
    if (valid) {
      expect(keys).toContain(key);
    } else {
      expect(keys).not.toContain(key);
    }
  }

  it('always includes certain choices', async () => {
    for (const key of 'tOITGfX') {
      await expectOption(key, {});
    }
  });

  it("does show the 'show output' option when the failure type is `warning_difference", async () => {
    await expectOption(
      'o',
      {result: {type: 'fail', failureType: 'warning_difference'}},
      false
    );
  });

  it("shows the 'show error' option only when errors and warnings are available", async () => {
    await expectOption(
      'e',
      {actual: {isSuccess: true, output: 'output'}},
      false
    );
    await expectOption('e', {
      actual: {isSuccess: true, output: 'output', warning: 'warning'},
    });
    await expectOption('e', {actual: {isSuccess: false, error: 'error'}});
  });

  it('does not show any of the update test choices on an unexpected todo', async () => {
    for (const key of 'OITG') {
      await expectOption(
        key,
        {result: {type: 'fail', failureType: 'unnecessary_todo'}},
        false
      );
    }
  });
});
