var assert = require('assert'),
    fs = require('fs'),
    exists = fs.existsSync,
    path = require('path'),
    join = require('path').join,
    read = fs.readFileSync,
    sass = require('node-sass');

describe('spec', function() {
  var normalize = function(str) {
    return str.replace(/\s+/g, '').replace('{', '{\n').replace(';', ';\n');
  };
  var suites = function() {
    var ret = {};
    var spec = join(__dirname, 'spec');
    var suites = fs.readdirSync(spec);
    var ignoreSuites = [
      'libsass-todo-issues',
      'libsass-todo-tests'
    ];

    suites.forEach(function(suite) {
      if (ignoreSuites.indexOf(suite) !== -1) {
        return;
      }

      var suitePath = join(spec, suite);
      var tests = fs.readdirSync(suitePath);

      ret[suite] = {};

      tests.forEach(function(test) {
        var testPath = join(suitePath, test);
        var hasErrorFile = fs.existsSync(join(testPath, 'error')) && !fs.statSync(join(testPath, 'error')).isDirectory();
        var hasError = false;
        if (hasErrorFile) {
          var errorFileContents = fs.readFileSync(join(testPath, 'error')).toString();
          hasError = !(
            errorFileContents.match(/^DEPRECATION WARNING/) ||
            errorFileContents.match(/^WARNING:/) ||
            errorFileContents.match(/^.*?\/input.scss:\d+ DEBUG:/)
          );
        }

        ret[suite][test] = {};
        ret[suite][test].src = join(testPath, 'input.scss');
        ret[suite][test].error = hasErrorFile && hasError;
        ret[suite][test].expected = join(testPath, 'expected_output.css');
        ret[suite][test].paths = [
          testPath,
          join(testPath, 'sub')
        ];
      });
    });

    return ret;
  }();

  Object.keys(suites).forEach(function(suite) {
    var tests = Object.keys(suites[suite]);

    describe(suite, function() {
      tests.forEach(function(test) {
        var t = suites[suite][test];

        if (exists(t.src)) {
          it(test, function(done) {
            var expected = normalize(read(t.expected, 'utf8'));

            sass.render({
              file: t.src,
              includePaths: t.paths
            }, function(error, result) {
              if (t.error) {
                assert(error);
              } else {
                assert(!error);
              }
              if (expected) {
                assert.equal(normalize(result.css.toString()), expected);
              }
              done();
            });
          });
        }
      });
    });
  });
});
