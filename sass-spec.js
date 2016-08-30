var assert = require('assert'),
    fs = require('fs'),
    exists = fs.existsSync,
    path = require('path'),
    join = require('path').join,
    read = fs.readFileSync,
    sass = require('node-sass'),
    readYaml = require('read-yaml'),
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
      var options = {};
      var optionsPath = join(suitePath, 'options.yml');
      if (fs.existsSync(optionsPath)) {
        options = readYaml.sync(optionsPath)
      }

      var tests = fs.readdirSync(suitePath);

      ret[suite] = {};
      
      ret[suite].options = options;

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
      var s = suites[suite];
      var isTodo = s.options[':todo'] != null && s.options[':todo'].indexOf('libsass') != -1;
      var isWarningTodo = s.options[':warning_todo'] != null && s.options[':warning_todo'].indexOf('libsass') != -1;
      var minVersion = parseFloat(s.options[':start_version']) || 0;
      var maxVersion = parseFloat(s.options[':end_version']) || 99;

      tests.forEach(function(test) {
        var t = suites[suite][test];
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
