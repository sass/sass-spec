var assert = require('assert'),
    fs = require('fs'),
    exists = fs.existsSync,
    path = require('path'),
    join = require('path').join,
    read = fs.readFileSync,
    sass = require('node-sass'),
    readYaml = require('read-yaml'),
    objectMerge = require('object-merge'),
    glob = require('glob'),
    impl = 'libsass',
    version = 3.4;

var normalize = function(str) {
  // This should be /\r\n/g, '\n', but there seems to be some empty line issues
  return str.replace(/\s+/g, '');
};

var specPath = join(__dirname, 'spec')
var inputs = glob.sync(specPath + '/**/input.*');

var initialize = function(folder, options) {
  var testCase = {};
  testCase.folder = folder;
  testCase.name = path.basename(folder);
  var inputScss = join(folder, 'input.scss')
  testCase.inputPath = exists(inputScss) ? inputScss : join(folder, 'input.sass');
  testCase.expectedPath = join(folder, 'expected_output.css');
  testCase.errorPath = join(folder, 'error');
  testCase.statusPath = join(folder, 'status');
  testCase.optionsPath = join(folder, 'options.yml');
  if (exists(testCase.optionsPath)) {
    options = objectMerge(options, readYaml.sync(testCase.optionsPath));
  }
  testCase.includePaths = [
    folder,
    join(folder, 'sub')
  ]
  testCase.precision = parseFloat(options[':precision']) || 5;
  testCase.outputStyle = options[':output_style'] ? options[':output_style'].replace(':', '') : 'nested';;
  testCase.todo = options[':todo'] != null && options[':todo'].indexOf(impl) != -1;
  testCase.warningTodo = options[':warning_todo'] != null && options[':warning_todo'].indexOf(impl) != -1;
  testCase.startVersion = parseFloat(options[':start_version']) || 0;
  testCase.endVersion = parseFloat(options[':end_version']) || 99;
  testCase.options = options;
  testCase.result = false;

  // Probe filesystem once and cache the results
  testCase.shouldFail = exists(testCase.statusPath) && !fs.statSync(testCase.statusPath).isDirectory();
  testCase.verifyStderr = exists(testCase.errorPath) && !fs.statSync(testCase.errorPath).isDirectory();
  return testCase;
}

describe('spec', function() {
  inputs.forEach(function(input) {
    var folder = path.dirname(input)
    var options = {};
    var optionsPath = specPath;
    // Try and walk the directory and merge the options
    var walkDirs = folder.replace(specPath + '/', '').split('/')
    while (walkDirs.length > 0) {
      optionsPath = join(optionsPath, walkDirs.shift())
      var optionsFile = join(optionsPath, 'options.yml');

      if (exists(optionsFile)) {
        options = objectMerge(options, readYaml.sync(optionsFile));
      }
    }

    var test = initialize(folder, options);

    it(test.folder, function(done) {
      if (test.todo || test.warningTodo) {
        this.skip('Test marked with TODO');
      } else if (version < test.startVersion) {
        this.skip('Tests marked for newer Sass versions only');
      } else if (version > test.endVersion) {
        this.skip('Tests marked for older Sass versions only');
      } else {
        var expected = normalize(read(test.expectedPath, 'utf8'));
        sass.render({
            file: test.inputPath,
            includePaths: test.includePaths,
            precision: test.precision,
            outputStyle: test.outputStyle
          }, function(error, result) {
            if (test.shouldFail) {
              // Replace 1, with parseInt(read(test.statusPath, 'utf8')) penind https://github.com/sass/libsass/issues/2162
              assert.equal(error.status, 1);
            } else if (test.verifyStderr) {
              var expectedError = read(test.errorPath, 'utf8');
              if (error === null) {
                // Probably a warning
                assert.ok(expectedError, 'Expected some sort of warning, but found none')
              } else {
                // The error messages seem to have some differences in areas
                // like line numbering, so we'll check the first line for the
                // general errror message only
                assert.equal(
                  error.formatted.toString().split("\n")[0],
                  expectedError.toString().split("\n")[0],
                  'Should Error.\nOptions' + JSON.stringify(test.options))
              }
            } else if (expected) {
              assert.equal(normalize(result.css.toString()), expected, 'Should equal with options ' + JSON.stringify(test.options));
            }
            done();
        });
      }
    });
  });
});
