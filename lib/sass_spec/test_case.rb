require 'pathname'
require_relative 'util'

# This represents a specific test case.
class SassSpec::TestCase
  attr_reader :metadata, :dir, :impl

  # The path to the input file for this test case.
  #
  # Note that this file is not guaranteed to exist on disk, since this test case
  # may be loaded from an HRX file.
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

  # Returns the test case for the given SassSpec::Directory and implementation
  # name.
  def initialize(dir, impl)
    @dir = dir
    @impl = impl
    @metadata = SassSpec::TestCaseMetadata.new(dir)
    @result = false

    input_files = @dir.glob("input.*")
    if input_files.empty?
      raise ArgumentError.new("No input file found in #{@dir}")
    elsif input_files.size > 1
      raise ArgumentError.new("Multiple input files found in #{@dir}")
    end
    @input = @dir.read(input_files.first)

    # If there's an impl-specific output file, then this is a success test.
    # Otherwise, it's an error test if there's *any* error file, impl-specific
    # or otherwise.
    if !file?("output.css", impl: true) && file?("error", impl: :auto)
      @expected_error = SassSpec::Util.normalize_error(read("error", impl: :auto))
    else
      if file?("output.css", impl: :auto)
        output = read("output.css", impl: :auto)
        # we seem to get CP850 otherwise
        # this provokes equal test to fail
        output = String.new(output).force_encoding('ASCII-8BIT')
        @expected = SassSpec::Util.normalize_output(output)
      end

      @expected_warning =
        if file?("warning", impl: :auto)
          SassSpec::Util.normalize_error(read("warning", impl: :auto))
        else
          ""
        end
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

  # Returns whether a file exists at `path` within this test case's directory.
  #
  # If `impl` is `true`, this adds an implementation-specific suffix to the
  # path. If `impl` is false (the default), it does not. If `impl` is `:auto`,
  # it returns true if either the implementation-specific file or the base file
  # exists.
  def file?(path, impl: false)
    path = _path(path, impl)
    path && @dir.file?(path)
  end

  # Reads the file at `path` within this test case's directory.
  #
  # If `impl` is `true`, this adds an implementation-specific suffix to the
  # path. If `impl` is false (the default), it does not. If `impl` is `:auto`,
  # it returns the contents of implementation-specific file if it exists, or the
  # base file if *it* exists, or throws an error if neither exists.
  def read(path, impl: false)
    unless resolved_path = _path(path, impl)
      raise "#@dir/#{path} doesn't exist"
    end

    @dir.read(resolved_path)
  end

  # Writes `contents` to `path` within this test case's directory.
  #
  # If `impl` is `true`, this adds an implementation-specific suffix to the
  # path. If `impl` is false (the default), it does not. If `impl` is `:auto`,
  # it writes to the implementation-specific file if it exists, and the base
  # file otherwise.
  def write(path, contents, impl: false)
    @dir.write(_path(path, impl) || path, contents)
  end

  # Deletes the file at `path` within this test case's directory.
  #
  # If `if_exists` is `true`, don't throw an error if the file doesn't exist.
  #
  # If `impl` is `true`, this adds an implementation-specific suffix to the
  # path. If `impl` is false (the default), it does not. If `impl` is `:auto`,
  # it deletes the implementation-specific file if it exists, or the base file
  # if *it* exists, or throws an error if neither exists.
  def delete(path, if_exists: false, impl: false)
    unless resolved_path = _path(path, impl)
      return if if_exists
      raise "#@dir/#{path} doesn't exist"
    end

    @dir.delete(resolved_path, if_exists: if_exists)
  end

  # Renames the file at `old` to `new` within this test case's directory.
  #
  # If `impl` is `true`, this adds an implementation-specific suffix to both
  # paths. If `impl` is false (the default), it does not. If `impl` is `:auto`,
  # it renames the implementation-specific file if it exists to an
  # implementation-specific version of `new`, or the base file if *it* exists to
  # `new`, or throws an error if neither exist.
  def rename(old, new, impl: false)
    unless resolved_old = _path(old, impl)
      raise "#@dir/#{old} doesn't exist"
    end

    new = _path(new, true) if resolved_old.include?("-#{@impl}")
    @dir.rename(resolved_old, new)
  end

  # Invokes EngineAdapter#compile on this test case and returns the result.
  def run(engine_adapter)
    @dir.with_real_files do
      engine_adapter.compile(
        File.join(@dir.path, @dir.glob("input.*").first),
        @metadata.output_style,
        @metadata.precision || 5)
    end
  end

  private

  # Returns the path of `path` within `dir`. 
  #
  # If `impl` is `true`, this adds an implementation-specific suffix to the
  # path. If `impl` is false (the default), it does not. If `impl` is `:auto`,
  # it returns the implementation-specific file if it exists, or the base file
  # if *it* exists, or `nil` if neither exists.
  def _path(path, impl)
    return path unless impl

    extension = File.extname(path)
    path_without_extension = extension.empty? ? path : path[0...-extension.length]
    path_with_impl = "#{path_without_extension}-#{@impl}#{extension}"

    return path_with_impl if impl == true || @dir.file?(path_with_impl)
    return path if @dir.file?(path)
  end
end
