require_relative 'capture_with_timeout'

class EngineAdapter

  def describe
    not_implemented
  end

  # The version string of the implementation
  def version
    not_implemented
  end

  def to_s
    describe
  end

  # Compile a Sass file and return the results
  # @return [css_output, std_error, status_code]
  def compile(sass_filename, style, precision)
    not_implemented
  end

  private

  def not_implemented
    raise RuntimeError, "Not yet implemented"
  end
end

class ExecutableEngineAdapater < EngineAdapter
  include CaptureWithTimeout

  def initialize(command, description = nil)
    @command = command
    @timeout = 20
    @description = description || command
  end

  def set_description(description)
    @description = description
  end

  def describe
    @description
  end

  def version
    require 'open3'
    stdout, stderr, status = Open3.capture3("#{@command} -v", :binmode => true)
    stdout.to_s
  end


  def compile(sass_filename, style, precision)
    cmd = "#{@command} --precision #{precision}"
    cmd += " -t #{style}" if style
    result = capture3_with_timeout("#{cmd} #{sass_filename}", :binmode => true, :timeout => @timeout)

    if result[:timeout]
      ["", "Execution timed out after #{@timeout}s", -1]
    else
      [result[:stdout], result[:stderr], result[:status].exitstatus]
    end
  end
end

class SassEngineAdapter < EngineAdapter
  def initialize(description)
    @description = description
  end

  def set_description(description)
    @description = description
  end

  def describe
    @description
  end

  def version
    require 'sass/version'
    Sass::VERSION
  end

  def compile(sass_filename, style, precision)
    require 'sass'
    # overloads STDERR
    stderr = StringIO.new
    # restore previous default encoding
    encoding = Encoding.default_external
    # Does not work as expected when tests are run in parallel
    # It runs tests in threads, so stderr is shared across them
    old_stderr, $stderr = $stderr, stderr
    begin
      Encoding.default_external = "UTF-8"
      Sass::Script::Value::Number.precision = precision
      sass_options = {}
      sass_options[:style] = style.to_sym if style
      css_output = Sass.compile_file(sass_filename.to_s, sass_options)
      # strings come back as utf8 encoded
      # internaly we only work with bytes
      err_output = stderr.string
      err_output.force_encoding('ASCII-8BIT')
      css_output.force_encoding('ASCII-8BIT')
      [css_output, err_output, 0]
    rescue Sass::SyntaxError => e
      # prepend the prefix to the message
      # and indent all lines to match it
      err_output = "Error: " + e.message.to_s
                   .gsub(/(?:\r?\n)(?!\z)/, "\n       ")
      err_output.force_encoding('ASCII-8BIT')
      ["", err_output, 65]
    rescue => e
      ["", e.to_s, 2]
    end
  ensure
    $stderr = old_stderr
    Encoding.default_external = encoding
  end
end
