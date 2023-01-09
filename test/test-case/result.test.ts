import {fromContents} from '../../lib/spec-directory';
import {mockCompiler} from '../fixtures/mock-compiler';
import TestCase, {TestResult} from '../../lib/test-case';
import {TodoMode} from '../../lib/test-case/util';

// TODO most of these tests can be factored out into tests that comparing two results work
describe('TestCase::result()', () => {
  async function runTestCase(
    content: string,
    opts: {todoMode?: TodoMode} = {}
  ): Promise<TestResult> {
    const dir = await fromContents(content.trimLeft());
    const test = await TestCase.create(
      dir,
      'sass-mock',
      mockCompiler(dir),
      opts.todoMode
    );
    return test.result();
  }

  describe('success cases', () => {
    it('passes if the outputs match', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> output.css
p {
  color: #ff8000;
}
`;
      expect(await runTestCase(input)).toMatchObject({type: 'pass'});
    });

    it('fails if the outputs are mismatched', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> output.css
p {
  color: #000000;
}`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
        failureType: 'output_difference',
      });
    });

    it('fails if the spec throws an error', async () => {
      const input = `
<===> input.scss
status: 1
stderr: |
  Error: expected ")".
<===> output.css
p {
  color: #000000;
}`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
        failureType: 'unexpected_error',
      });
    });
  });

  describe('error cases', () => {
    const input = `
<===> input.scss
status: 1
stderr: |
  Error: expected ")".
<===> error
Error: expected ")".
`;
    it('passes when the errors match', async () => {
      expect(await runTestCase(input)).toMatchObject({type: 'pass'});
    });

    it('fails on mismatched errors', async () => {
      const input = `
<===> input.scss
status: 1
stderr: |
  Error: expected ")".
<===> error
Error: expected "(".
`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
        failureType: 'error_difference',
      });
    });

    it('fails if the test case passes', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> error
Error: expected "(".
`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
        failureType: 'unexpected_success',
      });
    });
  });

  describe('warning cases', () => {
    it('passes when the warnings match', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
stderr: |
  WARNING: test
<===> output.css
p {
  color: #ff8000;
}

<===> warning
WARNING: test
`;
      expect(await runTestCase(input)).toMatchObject({type: 'pass'});
    });

    it('fails when the warnings are different', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
stderr: |
  WARNING: failure
<===> output.css
p {
  color: #ff8000;
}

<===> warning
WARNING: test
`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
        failureType: 'warning_difference',
      });
    });

    it('fails when expected warning is missing', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> output.css
p {
  color: #ff8000;
}

<===> warning
WARNING: test
`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
      });
    });

    it('fails when extraneous warning is present', async () => {
      const input = `
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
stderr: |
  WARNING: test
<===> output.css
p {
  color: #ff8000;
}
`;
      expect(await runTestCase(input)).toMatchObject({
        type: 'fail',
      });
    });

    const todoInput = `
<===> options.yml
:warning_todo:
  - sass-mock
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
stderr: |
  WARNING: failure
<===> output.css
p {
  color: #ff8000;
}

<===> warning
WARNING: test
`;

    it('skips warning checks if :warning_todo option enabled', async () => {
      expect(await runTestCase(todoInput)).toMatchObject({type: 'pass'});
    });

    it('runs warning check if `:warning_todo` is enabled but --run-todo is chosen', async () => {
      expect(await runTestCase(todoInput, {todoMode: 'run'})).toMatchObject({
        type: 'fail',
      });
    });

    it('marks a warning check as failed if it succeeds but --probe-todo is chosen', async () => {
      const input = `
<===> options.yml
:warning_todo:
  - sass-mock
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
stderr: |
  WARNING: test
<===> output.css
p {
  color: #ff8000;
}

<===> warning
WARNING: test
`;
      expect(await runTestCase(input, {todoMode: 'probe'})).toMatchObject({
        type: 'fail',
        failureType: 'unnecessary_todo',
      });
    });
  });

  describe('ignore', () => {
    it('marks a test as `skip` if the `:ignore_for` option enabled', async () => {
      const input = `
<===> options.yml
:ignore_for:
  - sass-mock
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> output.css
p {
  color: #000000;
}
`;
      expect(await runTestCase(input)).toMatchObject({type: 'skip'});
    });
  });

  describe('todo', () => {
    const failInput = `
<===> options.yml
:todo:
  - sass-mock
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> output.css
p {
  color: #000000;
}
`;
    it('marks a test as `todo` when the `:todo` option is set', async () => {
      expect(await runTestCase(failInput)).toMatchObject({type: 'todo'});
    });

    it('runs todos if --run-todo is set', async () => {
      expect(await runTestCase(failInput, {todoMode: 'run'})).toMatchObject({
        type: 'fail',
      });
    });

    it('marks a failing todo case as `todo` if --probe-todo is set', async () => {
      expect(await runTestCase(failInput, {todoMode: 'probe'})).toMatchObject({
        type: 'todo',
      });
    });

    it('marks a passing todo case as a failure when --probe-todo is set', async () => {
      const passInput = `
<===> options.yml
:todo:
  - sass-mock
<===> input.scss
status: 0
stdout: |
  p {
    color: #ff8000;
  }
<===> output.css
p {
  color: #ff8000;
}
`;
      expect(await runTestCase(passInput, {todoMode: 'probe'})).toMatchObject({
        type: 'fail',
        failureType: 'unnecessary_todo',
      });
    });
  });

  describe('invalid specs', () => {
    it('returns an error type if the test case was invalid', async () => {
      const input = `
<===> input.scss
p {
  color: black;
}
<===> input.sass
p
  color: black
      `;
      expect(await runTestCase(input)).toMatchObject({type: 'error'});
    });
  });
});
