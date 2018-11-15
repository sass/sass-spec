require 'pathname'
require_relative 'util'

# This represents a specific test case.
class SassSpec::TestCase
  attr_reader :metadata, :folder, :impl

  def initialize(folder, impl)
    @folder = File.expand_path(folder)
    @impl = impl
    @metadata = SassSpec::TestCaseMetadata.new(folder)
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

  def should_fail?
    expected_status != 0
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

  def input
    @input ||= File.read(input_path, :binmode => true, :encoding => "ASCII-8BIT")
  end

  def expected
    @expected ||=
      begin
        output = File.read(expected_path, :binmode => true, :encoding => "ASCII-8BIT")
        # we seem to get CP850 otherwise
        # this provokes equal test to fail
        output.force_encoding('ASCII-8BIT')
        SassSpec::Util.normalize_output(output)
      end
  end

  def expected_error
    @expected_error ||=
      if File.file?(error_path)
        error = File.read(error_path, :binmode => true, :encoding => "ASCII-8BIT")
        SassSpec::Util.normalize_error(error)
      else
        ""
      end
  end

  def expected_status
    @expected_status ||=
      if File.file?(status_path)
        @expected_status = File.read(status_path).to_i
      else
        @expected_status = 0
      end
  end

  def _expectation_path(basename)
    extension = File.extname(basename)
    path = File.join(@folder, File.basename(basename, extension))

    impl_path = "#{path}-#{impl}#{extension}"
    File.file?(impl_path) ? impl_path : "#{path}#{extension}"
  end
end
