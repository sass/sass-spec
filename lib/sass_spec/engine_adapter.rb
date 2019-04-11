require 'open3'
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
  def compile(sass_filename, precision)
    not_implemented
  end

  private

  def not_implemented
    raise RuntimeError, "Not yet implemented"
  end
end

class ExecutableEngineAdapter < EngineAdapter
  include CaptureWithTimeout

  def initialize(command, description = nil)
    @command = command
    @timeout = 90
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


  def compile(sass_filename, precision)
    command = File.absolute_path(@command)
    dirname, basename = File.split(sass_filename)
    result = capture3_with_timeout(
      command, "--precision", precision.to_s, "-t", "expanded", basename,
      binmode: true, timeout: @timeout, chdir: dirname)

    if result[:timeout]
      ["", "Execution timed out after #{@timeout}s", -1]
    else
      [result[:stdout], result[:stderr], result[:status].exitstatus]
    end
  end
end

class DartEngineAdapter < EngineAdapter
  attr_accessor :args

  def initialize(path)
    @path = path
    Tempfile.open("dart-sass-spec") do |f|
      f.write(<<-DART)
        import "dart:convert";
        import "dart:io";

        import "#{File.absolute_path @path}/bin/sass.dart" as sass;

        main() async {
          await for (var line in new LineSplitter().bind(utf8.decoder.bind(stdin))) {
            if (line.startsWith("!cd ")) {
              Directory.current = line.substring("!cd ".length);
              continue;
            }

            try {
              await sass.main(line.split(" ").where((arg) => arg.isNotEmpty).toList());
            } catch (error, stackTrace) {
              stderr.writeln("Unhandled exception:");
              stderr.writeln(error);
              stderr.writeln(stackTrace);
              exitCode = 255;
            }

            stdout.add([0xFF]);
            stdout.write(exitCode);
            stdout.add([0xFF]);
            stderr.add([0xFF]);
            exitCode = 0;
          }
        }
      DART
      @stdin, @stdout, @stderr = Open3.popen3("dart --packages=#{@path}/.packages #{f.path}")
      @stdout.set_encoding 'binary'
      @stderr.set_encoding 'binary'
    end
  end

  def describe
    "dart-sass"
  end

  def version
    `dart #{@path}/bin/sass.dart --version`
  end

  def compile(sass_filename, precision)
    dirname, basename = File.split(sass_filename)
    @stdin.puts "!cd #{File.absolute_path(dirname)}"
    @stdin.puts "--no-color --no-unicode #{@args} #{basename}"
    [next_chunk(@stdout), next_chunk(@stderr), next_chunk(@stdout).to_i]
  end

  private

  def next_chunk(io)
    result = io.gets("\xFF".force_encoding('binary'))
    return '' unless result
    return result[0...-1]
  end
end
