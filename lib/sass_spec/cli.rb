
module SassSpec::CLI
  def self.description
    "\nThis script will search for all files under the current (or specified) directory that are\n"+
    "named input.scss. It will then run a specified binary and check that the output matches the\n"+
    "expected output. If you want set up your own test suite, follow a similar hierarchy as described in\n"+
    "the initial comment of this script for your test hierarchy.\n\n"
  end

  def self.getusage
    "Usage: sass-spec.rb [Options]\n"+
    "\n"+
    "Options:\n"+
    "\t-c=, --command=\t\tSets a specific binary to run (defaults to 'sass')\n"+
    "\t-d=, --dir=\t\tSets the directory to recursively search for tests (defaults to '.')\n"+
    "\t-f, --fails\t\tDon't print out information about passing tests to make the output easier to wade through\n"+
    "\t-h, --help\t\tDisplay the help message\n"+
    "\t--nolog\t\t\tDon't display the log of diffs after all the tests are run\n"+
    "\t-v, --verbose\t\tDisplay more info\n\n"
  end

  def self.exampleusage
    "Example usage:\n"+
    "./sass-spec.rb -c='sassc'\n"+
    "./sass-spec.rb -d=mytestsuite -v\n\n"
  end

  def self.usage s, c
    $stderr.puts s + getusage
    exit c
  end

  def self.parse(argv)
    opts = {}
    
    opts[:cmd] = 'sass' #set to the default command
    opts[:srchpath] = '.' #set to the default path
    opts[:verbose] = false #don't be too talkative by default
    opts[:skip] = false #if a command doesn't exit nicely, stop testing (hidden flag so that people don't immeadiately use it when they shouldn't)
    opts[:fails] = false #ignore the stuff that works as intended
    opts[:nolog] = false #don't have me sift through the output for the summary
    
    argv.each do |arg|
      if arg =~ /^-(c|-command)=/ 
        opts[:cmd] = arg.split("=",2)[1]
        if opts[:cmd] == ""
          usage("\nERROR: Must specify a command after -c= or --command=\n\n", 1)
        end
      elsif arg =~ /^-(d|-dir)=/
        opts[:srchpath] = arg.split("=",2)[1]
        if opts[:srchpath] == ""
          usage("\nERROR: Must specify a directory to search after -d= or --dir=\n\n", 1)
        end
      elsif arg =~ /^-(f|-fails)$/ 
        opts[:fails] = true
      elsif arg =~ /^-(h|-help)$/ then
        puts description + getusage + exampleusage
        exit 0
      elsif arg =~ /^--nolog$/
        opts[:nolog] = true
      elsif arg =~ /^-(s|-skip)$/
        opts[:skip] = true
      elsif arg =~ /^-(v|-verbose)$/
        opts[:verbose] = true
      else #found an unhandled option, print an error and exit out
        usage "\nERROR: Unknown option: #{arg.inspect} (make sure to include the '=' for options that require it)\n\n", 2 
      end
    end
    
    unless opts[:srchpath].end_with?(File::Separator) then 
      #add a separator at the end if needed, necessary for globbing to find the needed files later
      opts[:srchpath]+=File::Separator
    end
    
    #not strictly necessary test, but allows a more tailored error message
    unless File.directory? opts[:srchpath]
      $stderr.puts "\nERROR: Directory specified needs to be a directory. You specified #{opts[:srchpath]}.\n"
      exit 3
    end
    opts
  end
end