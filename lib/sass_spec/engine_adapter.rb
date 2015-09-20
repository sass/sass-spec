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

  def compile(sass_filename, style)
    require 'sass'
    begin
      captured_stderr = StringIO.new
      real_stderr, $stderr = $stderr, captured_stderr
      begin
        css_output = Sass.compile_file(sass_filename.to_s, :style => style.to_sym)
        [css_output, captured_stderr.to_s, 0]
      rescue Sass::SyntaxError => e
        ["", "Error: " + e.message.to_s, 1]
      rescue => e
        ["", e.to_s, 2]
      end
    ensure
      $stderr = real_stderr
    end
  end
end
