require 'pathname'

# This represents a specific test case.
class SassSpec::TestCase
  def initialize(folder, options = {})
    folder = File.expand_path(folder)
    @metadata = SassSpec::TestCaseMetadata.new(folder, File.expand_path(options[:spec_directory]))
    @input_path = Pathname.new(find_input_path(folder))
    @expected_path = File.join(folder, "expected_output.css")
    @error_path = File.join(folder, "error")
    @status_path = File.join(folder, "status")
    @options_path = File.join(folder, "options")
    @options = options

    # Probe filesystem once and cache the results
    @should_fail = File.file?(@status_path)
    @verify_stderr = File.file?(@error_path)
  end

  def find_input_path(folder)
    input_files = Dir.glob(File.join(folder, "input.*"))
    if input_files.empty?
      raise ArgumentError.new("No input file found in #{folder}")
    elsif input_files.size > 1
      raise ArgumentError.new("Multiple input files found in #{folder}: #{input_files.join(', ')}")
    end
    input_files.first
  end

  def name
    @metadata.name
  end

  def precision
    @metadata.precision || 5
  end

  def clean_test
    @metadata.clean_output?
  end

  def output_style
    @metadata.output_style
  end

  def input_path
    @input_path
  end

  def expected_path
    @expected_path
  end

  def error_path
    @error_path
  end

  def verify_stderr?
    @verify_stderr
  end

  def status_path
    @status_path
  end

  def should_fail?
    @should_fail
  end

  def todo?
    @metadata.todo?(@options[:engine_adapter].describe)
  end

  def overwrite?
    @options[:generate] || @options[:nuke]
  end

  def output
    if @output
      return @output
    end

    stdout, stderr, status = engine.compile(@input_path, output_style, precision)

    if clean_test
      clean_out = _clean_output(stdout)
    else
      clean_out = _norm_output(stdout)
    end

    stderr = _clean_error(stderr)
    # always replace windows linefeeds
    stdout = stdout.gsub(/(\r\n)/, "\n")
    stderr = stderr.gsub(/(\r\n)/, "\n")

    @output ||= [stdout, clean_out, stderr, status]
  end

  def expected
    output = File.read(@expected_path, :binmode => true, :encoding => "ASCII-8BIT")
    # we seem to get CP850 otherwise
    # this provokes equal test to fail
    output.force_encoding('ASCII-8BIT')
    if clean_test
      @expected ||= _clean_output(output)
    else
      @expected ||= _norm_output(output)
    end
  end

  def expected_error
    @expected_error = _clean_error(File.read(@error_path, :binmode => true, :encoding => "ASCII-8BIT"))
  end

  def expected_status
    if should_fail?
      @expected_status = File.read(@status_path).to_i
    else
      @expected_status = 0
    end
  end

  def engine
    @options[:engine_adapter]
  end

  # normalization happens for every test
  def _norm_output(css)
    # we dont want to test for linux or windows line-feeds
    # but make sure we do not remove single cariage returns
    css = css.gsub(/(?:\r?\n)+/, "\n")
  end

  # cleaning only happens when requested for test
  # done by creating `expected.type.clean` flag file
  def _clean_output(css)
    _norm_output(css)
       .gsub(/\s+/, " ")
       .gsub(/\s*,\s*/, ",")
  end

  # errors are always cleaned
  # we also write them cleaned
  def _clean_error(err)
    err.gsub(/(?:\/todo_|_todo\/)/, "/") # hide todo pre/suffix
       .gsub(/\/libsass\-[a-z]+\-tests\//, "/") # hide test directory
       .gsub(/\/libsass\-[a-z]+\-issues\//, "/libsass-issues/") # normalize issue specs
       .gsub(/[\w\/.\-\\:]+?[\/\\]spec[\/\\]+/, "/sass/spec/") # normalize abs paths
       .sub(/(?:\r?\n)*\z/, "\n") # make sure we have exactly one trailing linefeed
       .sub(/\A(?:\r?\s)+\z/, "") # clear the whole file if only whitespace
  end

end
