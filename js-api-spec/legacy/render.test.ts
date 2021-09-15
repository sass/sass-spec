import * as sass from 'sass';

describe('renderSync()', () => {
  it('renders a string', done => {
    sass.render({data: 'a {b: c}'}, (err, result) => {
      expect(err).toBeFalsy();
      expect(result!.css.toString()).toBe('a {\n  b: c;\n}');
      done();
    });
  });
});
