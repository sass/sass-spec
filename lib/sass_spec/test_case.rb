require 'pathname'

# This represents a specific test case.
class SassSpec::TestCase
  attr_reader :metadata, :folder

  def initialize(folder, options = {})
    @folder = File.expand_path(folder)
    @options = options
    @metadata = SassSpec::TestCaseMetadata.new(folder)
    @result = false
  end

  def result?
    @result
  end

  def finalize(result)
    @result = result
  end

  def name
    @metadata.name
  end

  def input_path
    @input_path ||=
      begin
        input_files = Dir.glob(File.join(@folder, "input.*"))
        if input_files.empty?
          raise ArgumentError.new("No input file found in #{@folder}")
        elsif input_files.size > 1
          raise ArgumentError.new("Multiple input files found in #{@folder}: #{input_files.join(', ')}")
        end
        input_files.first
      end
  end

  def options_path
    File.join(@folder, "options.yml")
  end

  def expected_path
    @expected_path ||= _expectation_path("output.css")
  end

  def impl_expected_path
    File.join(@folder, "output-#{impl}.css")
  end

  def error_path
    @error_path ||= _expectation_path("error")
  end

  def impl_error_path
    File.join(@folder, "error-#{impl}")
  end

  def status_path
    @status_path ||= _expectation_path("status")
  end

  def impl_status_path
    File.join(@folder, "status-#{impl}")
  end

  def precision
    @metadata.precision || 5
  end

  def output_style
    @metadata.output_style
  end

  def verify_stderr?
    !expected_error.empty?
  end

  def interactive?
    @options[:interactive]
  end

  def migrate_version?
    @options[:migrate_version]
  end

  def migrate_impl?
    @options[:migrate_impl]
  end

  def should_fail?
    expected_status != 0
  end

  def impl
    @options[:engine_adapter].describe
  end

  def todo?
    @metadata.todo?(impl)
  end

  def probe_todo?
    # run todo tests but do not fail runner if one does not pass
    @options[:probe_todo] && (todo? || warning_todo?)
  end

  def warning_todo?
    @metadata.warning_todo?(impl)
  end

  def ignore?
    @metadata.ignore_for?(impl)
  end

  def ignore_warning?
    @metadata.ignore_warning_for?(impl)
  end

  def overwrite?
    @options[:generate]
  end

  def output
    if @output
      return @output
    end

    stdout, stderr, status = engine.compile(input_path, output_style, precision)
    clean_out = _norm_output(stdout)

    stderr = _clean_error(stderr)
    # always replace windows linefeeds
    stdout = stdout.gsub(/(\r\n)/, "\n")
    stderr = stderr.gsub(/(\r\n)/, "\n")

    @output ||= [stdout, clean_out, stderr, status]
  end

  def input
    @input ||= File.read(input_path, :binmode => true, :encoding => "ASCII-8BIT")
  end

  def expected
    output = File.read(expected_path, :binmode => true, :encoding => "ASCII-8BIT")
    # we seem to get CP850 otherwise
    # this provokes equal test to fail
    output.force_encoding('ASCII-8BIT')
    @expected ||= _norm_output(output)
  end

  def expected_error
    @expected_error ||=
      if File.file?(error_path)
        _clean_error(File.read(error_path, :binmode => true,
                               :encoding => "ASCII-8BIT"))
      else
        ""
      end
  end

  def equivalent?(other_test_case)
    output == other_test_case.output
  end

  def expected_status
    @expected_status ||=
      if File.file?(status_path)
        @expected_status = File.read(status_path).to_i
      else
        @expected_status = 0
      end
  end

  def engine
    @options[:engine_adapter]
  end

  def _expectation_path(basename)
    extension = File.extname(basename)
    path = File.join(@folder, File.basename(basename, extension))

    impl_path = "#{path}-#{impl}#{extension}"
    File.file?(impl_path) ? impl_path : "#{path}#{extension}"
  end

  # normalization happens for every test
  def _norm_output(css)
    # we dont want to test for linux or windows line-feeds
    # but make sure we do not remove single cariage returns
    css = css.gsub(/(?:\r?\n)+/, "\n")
  end

  # errors are always cleaned
  # we also write them cleaned
  def _clean_error(err)
    err.gsub(/(?:\/todo_|_todo\/)/, "/") # hide todo pre/suffix
       .gsub(/\/libsass\-[a-z]+\-tests\//, "/") # hide test directory
       .gsub(/\/libsass\-[a-z]+\-issues\//, "/libsass-issues/") # normalize issue specs
       .gsub(/(([\w\/.\-\\:]+?[\/\\])|([\/\\]|(?!:\s)))spec[\/\\]+/, "/sass/spec/") # normalize abs paths
       .sub(/(?:\r?\n)*\z/, "\n") # make sure we have exactly one trailing linefeed
       .sub(/\A(?:\r?\s)+\z/, "") # clear the whole file if only whitespace
  end

end
