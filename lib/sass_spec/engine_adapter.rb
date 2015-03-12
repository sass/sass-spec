require "open3"

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
  def compile(sass_filename)
    not_implemented
  end

  private

  def not_implemented
    raise RuntimeError, "Not yet implemented"
  end
end

class ExecutableEngineAdapater < EngineAdapter

  def initialize(command, description = nil)
    @command = command
    @description = description || command
  end

  def describe
    @description
  end

  def version
    stdout, stderr, status = Open3.capture3("#{@command} -v")
    stdout.to_s
  end


  def compile(sass_filename, style)
    Open3.capture3("#{@command} -t #{style} #{sass_filename}")
  end
end

class SassEngineAdapter < EngineAdapter
  def initialize(description)
    @description = description
  end

  def describe
    @description
  end

  def version
    require 'sass/version'
    Sass::VERSION
  end

  def compile(sass_filename)
    require 'sass'
    begin
      captured_stderr = StringIO.new
      real_stderr, $stderr = $stderr, captured_stderr
      begin
        css_output = Sass.compile_file(sass_filename.to_s)
        [css_output, captured_stderr.to_s, 0]
      rescue Sass::SyntaxError => e
        [Sass::SyntaxError.exception_to_css(e), captured_stderr.string, 1]
      rescue => e
        [Sass::SyntaxError.exception_to_css(e), captured_stderr.string, 2]
      end
    ensure
      $stderr = real_stderr
    end
  end
end
