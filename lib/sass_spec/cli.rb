require_relative 'engine_adapter'

module SassSpec::CLI
  require 'optparse'

  def self.parse
    options = {
      engine_adapter: SassEngineAdapter.new("sass"),
      spec_directory: "spec",
      generate: [],
      tap: false,
      skip: false,
      verbose: false,
      filter: "",
      limit: -1,
      unexpected_pass: false,
      nuke: false,

      # Constants
      output_styles: ["nested", "compressed", "expanded", "compact"],
      input_files: ["input.scss", "input.sass"],
      nested_output_file: 'expected_output',
      compressed_output_file: 'expected.compressed',
      expanded_output_file: 'expected.expanded',
      compact_output_file: 'expected.compact'
    }

    OptionParser.new do |opts|
      opts.banner = "Usage: ./sass-spec.rb [options]

Examples:
  Run `sassc --style compressed input.scss`:
  ./sass-spec.rb -c 'sass --style compressed'

  Run tests only in the spec/basic folder:
  ./sass-spec.rb spec/basic

This script will search for all files under the spec (or specified) directory
that are named input.scss. It will then run a specified binary and check that
the output matches the expected output. If you want set up your own test suite,
follow a similar hierarchy as described in the initial comment of this script
for your test hierarchy.

This command can also be used to annotate tests to control which tests are ran
and when. For details: ./sass-spec.rb annotate -h

Make sure the command you provide prints to stdout.

"

      opts.on("-v", "--verbose", "Run verbosely") do
        options[:verbose] = true
      end

      opts.on("-t", "--tap", "Output TAP compatible report") do
        options[:tap] = true
      end

      opts.on("-c", "--command COMMAND", "Sets a specific binary to run (defaults to '#{options[:engine_adapter]}')") do |v|
        options[:engine_adapter] = ExecutableEngineAdapater.new(v)
      end

      opts.on("-g", "--generate format", "Run test and generate output files for the specified format or \"all\"") do |v|
        if v == "all"
          options[:generate].replace(options[:output_styles])
        else
          if options[:output_styles].include?(v)
            options[:generate] << v
          else
            raise "--generate needs a valid output format #{options[:output_styles]} or \"all\""
          end
        end
      end

      opts.on("--ignore-todo", "Skip any folder named 'todo'") do
        options[:skip_todo] = true
      end

      opts.on("--filter PATTERN", "Run tests that match the pattern you provide") do |pattern|
        options[:filter] = pattern
      end

      opts.on("--limit NUMBER", "Limit the number of tests run to this positive integer.") do |limit|
        options[:limit] = limit.to_i
      end

      opts.on("-s", "--skip", "Skip tests that fail to exit successfully") do
        # Note: --skip is no longer necessary as this is now the default behavior, since we test for errors
      end

      opts.on("--nuke", "Write a new expected_output for every test from whichever engine we are using") do
        options[:nuke] = true
      end

      opts.on("--unexpected-pass", "When running the todo tests, flag as an error when a test passes which is marked as todo.") do
        options[:unexpected_pass] = true
      end

      opts.on("--silent", "Don't show any logs") do
        options[:silent] = true
      end
    end.parse!

    options[:spec_directory] = ARGV[0] if !ARGV.empty?

    options
  end
end
