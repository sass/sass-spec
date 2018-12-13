require 'pathname'
require_relative 'util'

# This represents a specific test case.
class SassSpec::TestCase
  attr_reader :metadata, :folder, :impl

  # The path to the input file for this test case.
  attr_reader :input_path

  # The Sass or SCSS input for this test case.
  attr_reader :input

  # The normalized expected CSS output. This is `nil` if the test is expected to
  # fail, or if it's malformed and has no expectations.
  attr_reader :expected

  # The normalized expected warning text. This is `nil` if the test is expected
  # to fail, or if it's malformed and has no expectations. It's `""` if the test
  # is expected to succeed without warnings.
  attr_reader :expected_warning

  # The normalized expected error message. This is `nil` if the test is expected
  # to succeed, or if it's malformed and has no expectations.
  attr_reader :expected_error

  def initialize(folder, impl)
    @folder = File.expand_path(folder)
    @impl = impl
    @metadata = SassSpec::TestCaseMetadata.new(folder)
    @result = false

    input_files = Dir.glob(path("input.*"))
    if input_files.empty?
      raise ArgumentError.new("No input file found in #{@folder}")
    elsif input_files.size > 1
      raise ArgumentError.new("Multiple input files found in #{@folder}: #{input_files.join(', ')}")
    end
    @input_path = input_files.first
    @input = File.read(@input_path, :binmode => true, :encoding => "ASCII-8BIT")

    if File.file?(path("output.css", impl: true))
      expected_path = path("output.css", impl: true)
      warning_path = path("warning", impl: :auto)
    elsif error_path = path("error", impl: :auto)
      # error_path is already set
    else
      expected_path = path("output.css")
      warning_path = path("warning", impl: :auto)
    end

    if expected_path
      if File.exist?(expected_path)
        output = File.read(expected_path, :binmode => true, :encoding => "ASCII-8BIT")
        # we seem to get CP850 otherwise
        # this provokes equal test to fail
        output.force_encoding('ASCII-8BIT')
        @expected = SassSpec::Util.normalize_output(output)
      end
      @expected_warning = warning_path ? _expected_error_or_warning(warning_path) : ""
    else
      @expected_error = _expected_error_or_warning(error_path) if error_path
    end
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

  def options_path
    path("options.yml")
  end

  def precision
    @metadata.precision || 10
  end

  def output_style
    @metadata.output_style
  end

  def should_fail?
    !!expected_error
  end

  def todo?
    @metadata.todo?(impl)
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

  # Returns the path of `basename` within `folder`. If `impl` is `true`, this
  # adds an implementation-specific suffix to the path. If `impl` is false (the
  # default), it does not. If `impl` is `:auto`, it returns the
  # implementation-specific file if it exists, or the base file if *it* exists,
  # or `nil` if neither exists.
  def path(basename, impl: false)
    path_without_impl = File.join(@folder, basename)
    return path_without_impl unless impl

    extension = File.extname(basename)
    path_without_extension = File.join(@folder, File.basename(basename, extension))
    path_with_impl = "#{path_without_extension}-#{@impl}#{extension}"

    return path_with_impl if impl == true || File.file?(path_with_impl)
    return path_without_impl if File.file?(path_without_impl)
  end

  private

  # Loads and normalizes the error or warning expectation at the given path.
  def _expected_error_or_warning(path)
    text = File.read(path, :binmode => true, :encoding => "ASCII-8BIT")
    SassSpec::Util.normalize_error(text)
  end
end
