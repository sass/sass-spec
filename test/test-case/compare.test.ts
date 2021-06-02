import {
  extractErrorMessage,
  extractWarningMessages,
  normalizeOutput,
} from '../../lib-js/test-case/compare';

describe('result comparison', () => {
  describe('normalizeOutput', () => {
    it('collapses multiple newlines', () => {
      expect(normalizeOutput('a\n\nb')).toEqual('a\nb');
    });

    it('normalizes line carriages', () => {
      expect(normalizeOutput('a\r\nb')).toEqual('a\nb');
      expect(normalizeOutput('a\r\n\r\nb')).toEqual('a\nb');
    });

    it('collapses input paths', () => {
      expect(normalizeOutput('Error at /long-dir/input.scss')).toEqual(
        'Error at input.scss'
      );
      expect(normalizeOutput('Error at /long-dir/input.sass')).toEqual(
        'Error at input.sass'
      );
    });
  });

  describe('extractErrorMessages', () => {
    it('Gets the message starting with `Error`', () => {
      const input = `
Error: ordinal arguments must precede named arguments
        on line 3 of input.scss
>> @include a($b: 1, 2) {}

   ------------------^
   `;
      expect(extractErrorMessage(input)).toEqual(
        'Error: ordinal arguments must precede named arguments'
      );
    });

    // TODO re-enable when the specs are fixed
    it.skip('Works on multi-line errors', () => {
      const input1 = `
Error: Variable keyword argument map must have string keys.
a #b is not a string in (a #b: c).
  ,
1 | $id: inspect((a#b:c)...)
  |              ^^^^^^^
  '
  input.scss 1:14  root stylesheet
      `;
      const input2 = `
Error: Variable keyword argument map must have string keys.
a #b is not a string in (a #b: d).
  ,
1 | $id: inspect((a#b:d)...)
  |              ^^^^^^^
  '
  input.scss 1:14  root stylesheet
      `;
      expect(extractErrorMessage(input1)).not.toEqual(
        extractErrorMessage(input2)
      );
    });
  });

  describe('extractWarningMessages', () => {
    it('extracts WARNING messages', () => {
      const input = `
WARNING: warning
    input.scss 1:1  root stylesheet`;
      expect(extractWarningMessages(input)).toEqual('WARNING: warning');
    });

    // TODO deprecation warning parsing is broken right now.
    // fixing it would require updating a lot of the tests.
    it.todo('extracts DEPRECATION WARNING messages');
  });
});
