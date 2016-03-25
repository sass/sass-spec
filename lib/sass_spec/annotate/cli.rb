require 'set'
require 'yaml'
require 'command_line_reporter'

class SassSpec::Annotate::CLI
  include CommandLineReporter

  def self.parse(args)
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
        options[:start_verion] = version
      end

      opts.on("--end-version VERSION",
              "Set the Sass language first version for which the test(s) are valid.",
              "Pass a version of 'unset' to remove the end version.") do |version|
        version = nil if version =~ /unset/i
        options[:end_verion] = version
      end

      opts.on("--expect-failure IMPLEMENTATION",
              "Expect implementation to fail for the specified tests.") do |impl|
        (options[:add_expect_failure] ||= Set.new) << impl
      end

      opts.on("--expect-pass IMPLEMENTATION",
              "Expect implementation to pass for the specified tests.") do |impl|
        (options[:remove_expect_failure] ||= Set.new) << impl
      end

      opts.on("--pending IMPLEMENTATION",
              "Mark implementation as not having implemented the tests.") do |impl|
        (options[:add_todo] ||= Set.new) << impl
      end

      opts.on("--activate IMPLEMENTATION",
              "Mark implementation as having implemented the tests.") do |impl|
        (options[:remove_todo] ||= Set.new) << impl
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
    new(options, args)
  end

  def initialize(options, paths)
    @options = options
    @paths = paths
  end

  def annotate
    @paths.each {|path| annotate_path(path)}
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
      describe(path, key, value)
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

  def describe(path, key, value)
  end

  def log(message, &block)
    block = Proc.new {} unless block
    report(message: message, type: 'inline', complete: "done", &block)
  end
end
