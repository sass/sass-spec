import {SpecDirectory} from '../spec-directory';
import {ExpectedSassResult} from './util';

// Ensure that the directory has exactly one output or error file
function checkDuplicateOutputs(dir: SpecDirectory, impl: string): void {
  if (dir.hasFile(`output-${impl}.css`) && dir.hasFile(`error-${impl}`)) {
    throw new Error(`Found both output and error file for ${impl}.`);
  }

  if (dir.hasFile('output.css') && dir.hasFile('error')) {
    throw new Error('Found both `output.css` and `error` file.');
  }
}

// Returns true if the directory expects a successful result, false if it
// expects an error, or null if it doesn't have any expectation at all.
function expectsSuccess(dir: SpecDirectory, impl: string): boolean | null {
  if (dir.hasFile(`output-${impl}.css`)) return true;
  if (dir.hasFile(`error-${impl}`)) return false;
  if (dir.hasFile('output.css')) return true;
  if (dir.hasFile('error')) return false;
  return null;
}

function getResultFile(
  dir: SpecDirectory,
  impl: string,
  type: 'output' | 'error' | 'warning'
): string {
  const ext = type === 'output' ? '.css' : '';
  const overrideFile = `${type}-${impl}${ext}`;
  return dir.hasFile(overrideFile) ? overrideFile : `${type}${ext}`;
}

/**
 * Get the expected test result for the given spec directory and implementation.
 */
export async function getExpectedResult(
  dir: SpecDirectory,
  impl: string
): Promise<ExpectedSassResult> {
  checkDuplicateOutputs(dir, impl);
  const isSuccessCase = expectsSuccess(dir, impl);
  if (isSuccessCase === null) return {isSuccess: null};
  const resultFilename = getResultFile(
    dir,
    impl,
    isSuccessCase ? 'output' : 'error'
  );
  const expected = await dir.readFile(resultFilename);

  let warning;
  // check if there's a warning
  const warningFilename = getResultFile(dir, impl, 'warning');
  if (dir.hasFile(warningFilename)) {
    // TODO this check is deactivated because there are existing test cases
    // with warning and error files (usually when error is overridden)
    // if (!isSuccessCase) {
    //   throw new Error(`Found warning file for test case expecting failure`)
    // }
    warning = await dir.readFile(warningFilename);
  }

  if (isSuccessCase) {
    return {isSuccess: true, output: expected, warning};
  } else {
    return {isSuccess: false, error: expected};
  }
}
