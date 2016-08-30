var assert = require('assert'),
    fs = require('fs'),
    exists = fs.existsSync,
    path = require('path'),
    join = require('path').join,
    read = fs.readFileSync,
    sass = require('node-sass'),
    readYaml = require('read-yaml'),
    objectMerge = require('object-merge'),
    version = 3.4;

describe('spec', function() {
  var normalize = function(str) {
    return str.replace(/\s+/g, '').replace('{', '{\n').replace(';', ';\n');
  };
  var suites = function() {
    var ret = {};
    var spec = join(__dirname, 'spec');
    var suites = fs.readdirSync(spec);

    suites.forEach(function(suite) {
      var suitePath = join(spec, suite);
      var suiteOptions = {};
      var suiteOptionsPath = join(suitePath, 'options.yml');
      if (fs.existsSync(suiteOptionsPath)) {
        suiteOptions = readYaml.sync(suiteOptionsPath);
      }

      var tests = fs.readdirSync(suitePath);

      ret[suite] = {};

      tests.forEach(function(test) {
        var testPath = join(suitePath, test);
        var testOptions = suiteOptions;
        var testOptionsPath = join(testPath, 'options.yml');
        if (fs.existsSync(testOptionsPath)) {
          testOptions = objectMerge(testOptions, readYaml.sync(testOptionsPath));
        }
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
        ret[suite][test].options = testOptions;
      });
    });

    return ret;
  }();

  Object.keys(suites).forEach(function(suite) {
    var tests = Object.keys(suites[suite]);

    describe(suite, function() {

      tests.forEach(function(test) {
        var t = suites[suite][test];
        var isTodo = t.options[':todo'] != null && t.options[':todo'].indexOf('libsass') != -1;
        var isWarningTodo = t.options[':warning_todo'] != null && t.options[':warning_todo'].indexOf('libsass') != -1;
        var minVersion = parseFloat(t.options[':start_version']) || 0;
        var maxVersion = parseFloat(t.options[':end_version']) || 99;
        if (exists(t.src)) {
          it(test, function(done) {
            if (isTodo || isWarningTodo) {
              this.skip("Test marked with TODO");
            } else if (version < minVersion) {
              this.skip("Tests marked for newer Sass versions only");
            } else if (version > maxVersion) {
              this.skip("Tests marked for older Sass versions only");
            } else {
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
            }
          });
        }
      });
    });
  });
});
