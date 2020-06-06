# encoding: utf-8

require 'command_line_reporter'
require 'pathname'
require 'yaml'

class SassSpec::Stats::CLI
  include CommandLineReporter

  def self.parse(args)
    options = {}
    parser = OptionParser.new
    parser.banner = <<BANNER
Usage: ./stats.rb [options] [directories...]

This command prints stats about the repo.

BANNER

    parser.on("--todo IMPLEMENTATION",
              "Find specs that have a todo for the given implementation.") do |impl|
      options[:todo] = impl
    end

    parser.on("--issue GITHUB_ISSUE",
              "Find specs that correspond to a Github issue.") do |issue|
      unless issue =~ /.+#\d+/
        warn("Invalid issue.\n\n")
        puts parser.help()
      end
      issue = issue.split("#")
      number = issue.pop
      issue = issue.join().split("/")
      impl = issue.pop
      options[:issue] = "#{impl}##{number}"
    end

    parser.on("--missing-issue",
              "Find specs that have a todo without a Github issue.") do
      options[:missing_issue] = true
    end

    parser.on("-h", "--help", "Print this help message.") do
      puts parser.help()
      return nil
    end

    parser.parse!(args)
    options[:dirs] = args.dup.map{ |d| File.expand_path(d) } if args.any?
    new(options)
  end

  def initialize(options)
    @options = options
  end

  ##
  # Given the options provided to the CLI, filters through spec metadata to
  # aggregate statistics about the specs. Prints a stats report.
  def stats
    metadata = get_metadata()

    if @options[:todo]
      metadata = filter_todos_by_implementation(metadata)
    end

    if @options[:issue]
      metadata = filter_todos_by_issue(metadata)
    end

    if @options[:missing_issue]
      metadata = filter_todos_missing_issue(metadata)
    end
  end

  ##
  # Filter a set of metadata to those with a todo for the given implementation.
  #
  # @param [Array<SassSpec::TestCaseMetadata>]
  # @return Array<SassSpec::TestCaseMetadata>]
  def filter_todos_by_implementation(metadata)
    metadata.select do |meta|
      todos = meta.options[:todo]
      next unless todos
      todos.select { |todo| todo.include? @options[:todo] }.any?
    end
  end

  ##
  #  Filter a set of metadata to those with a todo for the given Github issue.
  #
  # @param [Array<SassSpec::TestCaseMetadata>]
  # @return Array<SassSpec::TestCaseMetadata>]
  def filter_todos_by_issue(metadata)
    metadata.select do |meta|
      todos = get_yaml(meta)[:todo]
      next unless todos
      todos.select { |todo| todo.include? @options[:issue] }.any?
    end
  end

  ##
  #  Filter a set of metadata to those with a todo missing a Github issue.
  #
  # @param [Array<SassSpec::TestCaseMetadata>]
  # @return Array<SassSpec::TestCaseMetadata>]
  def filter_todos_missing_issue(metadata)
    metadata.select do |meta|
      todos = get_yaml(meta)[:todo]
      next unless todos
      todos.select { |todo| !todo.include? "#" }.any?
    end
  end

  ##
  # Gets the raw YAML representation of a spec's metadata. Useful when
  # inspecting for patterns that get normalized away by TestCaseMetadata.
  #
  # @param [SassSpec::TestCaseMetadata] metadata
  # @return [YAML]
  def get_yaml(metadata)
    dir = SassSpec::Directory.new(metadata.name)
    YAML.load(dir.read("options.yml"))
  end

  ##
  # Gets all of the metadata in the spec directories.
  #
  # @return [Array<SassSpec::TestCaseMetadata>]
  def get_metadata
    dirs = @options[:dirs] || [SassSpec::SPEC_DIR].map do |dir|
      SassSpec::Directory.new(dir)
    end

    option_files = dirs.flat_map do |dir|
      dir.glob("**/options.yml").map do |file|
        File.join(dir.path, file)
      end
    end.uniq

    metadata = option_files.map do |file|
      dir = SassSpec::Directory.new(File.dirname(file))
      SassSpec::TestCaseMetadata.new(dir)
    end
  end
end
