# encoding: UTF-8
require 'set'
require 'yaml'
require 'command_line_reporter'

class SassSpec::Annotate::CLI
  include CommandLineReporter

  def self.assert_legal_version(version)
    if version && !SassSpec::LANGUAGE_VERSIONS.include?(version)
      warn "Version #{version} is not valid. " +
           "Did you mean one of: #{SassSpec::LANGUAGE_VERSIONS.join(', ')}"
      return false
    end
    true
  end

  def self.assert_not_file!(string, expected)
    if File.exist?(string) || string.include?(File::SEPARATOR)
      warn "Expected #{expected} but got a file path. Did you forget the argument?"
      return false
    end
    true
  end

  def self.parse(args)
    runner_options = {
    }
    options = {
    }
    parser = OptionParser.new do |opts|
      opts.banner = <<BANNER
Usage: ./sass-spec.rb annotate [options] PATH [PATH...]

This sub command helps you annotate spec tests.

BANNER

      opts.on("--start-version VERSION",
              "Set the Sass language first version for which the test(s) are valid.",
              "Pass a version of 'unset' to remove the start version.") do |version|
        version = nil if version =~ /unset/i
        return unless assert_legal_version(version)
        options[:start_version] = version
      end

      opts.on("--end-version VERSION",
              "Set the Sass language first version for which the test(s) are valid.",
              "Pass a version of 'unset' to remove the end version.") do |version|
        version = nil if version =~ /unset/i
        return unless assert_legal_version(version)
        options[:end_version] = version
      end

      opts.on("--output-style STYLE",
              [:expanded, :compact, :nested, :compressed, :unset],
              "Set the output style for the specified tests.") do |output_style|
        output_style = nil if output_style =~ /unset/i
        options[:output_style] = output_style
      end

      opts.on("--[no-]clean-output", "Do some basic whitespace normalization.") do |clean|
        clean = nil unless clean
        options[:clean] = clean
      end

      opts.on("--precision INTEGER",
              "Set the numeric output precision for the specified tests.",
              "Pass a precision of 'unset' to remove the precision.") do |precision|
        if precision =~ /unset/i
          precision = nil
        elsif precision =~ /^\d+$/
          precision = precision.to_i
        else
          warn "Precision must be set to a positive integer (or to 'unset')\n\n"
          warn opts.help()
          return nil
        end
        options[:precision] = precision
      end

      opts.on("--expect-failure IMPLEMENTATION",
              "Expect implementation to fail for the specified tests.") do |impl|
        return unless assert_not_file!(impl, "implementation for --expect-failure")
        (options[:add_expect_failure] ||= Set.new) << impl
      end

      opts.on("--expect-pass IMPLEMENTATION",
              "Expect implementation to pass for the specified tests.") do |impl|
        return unless assert_not_file!(impl, "implementation for --expect-pass")
        (options[:remove_expect_failure] ||= Set.new) << impl
      end

      opts.on("--pending IMPLEMENTATION",
              "Mark implementation as not having implemented the tests.") do |impl|
        return unless assert_not_file!(impl, "implementation for --pending")
        (options[:add_todo] ||= Set.new) << impl
      end

      opts.on("--activate IMPLEMENTATION",
              "Mark implementation as having implemented the tests.") do |impl|
        return unless assert_not_file!(impl, "implementation for --activate")
        (options[:remove_todo] ||= Set.new) << impl
      end

      opts.on("--report", "Generate a report after running.") do |impl|
        runner_options[:report] = true
      end

      opts.on("-h", "--help", "Print this help message.") do |impl|
        puts opts.help()
        return nil
      end
    end
    parser.parse!(args)
    if args.empty?
      warn parser.help
      return nil
    end
    args.each do |path|
      unless File.exists?(path)
        warn "Error: #{path} does not exist."
        return nil
      end
    end
    new(options, runner_options, args)
  end

  def initialize(options, runner_options, paths)
    @runner_options = runner_options
    @options = options
    @paths = paths
  end

  def annotate
    @paths.each {|path| annotate_path(path)}
    if @runner_options[:report]
      require 'terminfo'
      @paths.each {|path| report_path(path)}
    end
    return true
  end

  def annotate_path(path)
    report(message: "#{path}:", complete: "") do
      options_file = path.end_with?("options.yml") ? path : File.join(path, "options.yml")
      if File.exists?(options_file)
        current_options = YAML.load_file(options_file)
      else
        current_options = {}
      end
      @options.each do |(key, value)|
        if key =~ /add_(.*)/
          key = $1.to_sym
          current_options[key] ||= []
          value.each do |v|
            current_options[key] << v
            log("* adding #{v} to #{key} list")
          end
          current_options[key].uniq!
        elsif key =~ /remove_(.*)/
          key = $1.to_sym
          current_options[key] ||= []
          value.each do |v|
            current_options[key].delete(v)
            log("* removing #{v} from #{key} list")
          end
          current_options.delete(key) if current_options[key].empty?
        elsif value.nil?
          current_options.delete(key)
          log("* unsetting #{key}") {}
        else
          current_options[key] = value
          log("* setting #{key} to #{value}") {}
        end
      end
      File.open(options_file, "w") do |f|
        f.write(current_options.to_yaml)
      end
    end
  end

  def report_path(path)
    test_case_dirs = Dir.glob(File.join(path, "**/input.scss")).map {|p| File.dirname(p) }.uniq.sort
    metadatas = test_case_dirs.map{|d| SassSpec::TestCaseMetadata.new(d) }
    TermInfo.screen_size
    max_length = [
      metadatas.map {|m| m.name.length}.max,
      TermInfo.screen_size.last - SassSpec::LANGUAGE_VERSIONS.length * 6 - 4
    ].min
    table(border: true, encoding: :ascii, width: max_length + SassSpec::LANGUAGE_VERSIONS.length * 3) do
      row(header: true) do
        column("Test Case", width: max_length)
        SassSpec::LANGUAGE_VERSIONS.each do |version|
          column(version, width: 3, align: "center")
        end
      end
      metadatas.each do |md|
        row do
          report_test_case(md)
        end
      end
    end
  end

  def report_test_case(metadata)
    column(metadata.name)
    SassSpec::LANGUAGE_VERSIONS.each do |version|
      v = Gem::Version.new(version)
      if metadata.valid_for_version(v)
        column("✓")
      else
        column("")
      end
    end
  end

  def log(message, &block)
    block = Proc.new {} unless block
    report(message: message, type: 'inline', complete: "done", &block)
  end
end
