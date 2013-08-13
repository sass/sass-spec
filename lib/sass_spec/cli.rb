
module SassSpec::CLI
  require 'optparse'

  def self.parse
    options = {
      sass_executable: "sass",
      spec_directory: "spec",
      only_display_failures: false
    }
    OptionParser.new do |opts|
      opts.banner = "Example usage: \n sass-spec.rb -c 'sassc' \n ./sass-spec.rb -d mytestsuite -v\n\n" +
                    "\nThis script will search for all files under the current (or specified) directory that are\n"+
                    "named input.scss. It will then run a specified binary and check that the output matches the\n"+
                    "expected output. If you want set up your own test suite, follow a similar hierarchy as described in\n"+
                    "the initial comment of this script for your test hierarchy.\n\n"

      opts.on("-v", "--[no-]verbose", "Run verbosely") do |v|
        options[:verbose] = v
      end

      opts.on("-c", "--command=", "Sets a specific binary to run (defaults to 'sass')") do |v|
        options[:sass_executable] = v 
      end

      opts.on("-d", "--dir=", "Sets the directory to recursively search for tests (defaults to 'spec')") do |v|
        options[:spec_directory] = v
      end

      opts.on("--ignore-todo", "Skip any folder named 'todo'") do
        options[:skip_todo] = true
      end

      opts.on("-s", "--skip", "Skip tests that fail to exit successfully") do
        options[:skip] = true
      end

      opts.on("-f", "--only-fails", "Only display failures") do
        options[:only_display_failures] = true
      end

      opts.on("--silent", "Don't show any logs") do
        options[:silent] = true
      end
    end.parse!
    options
  end
end
