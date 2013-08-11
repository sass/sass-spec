
class SassSpec::Runner
  def initialize(options = {})
    @options = options
  end

  def printResults nolog, test_count, worked, did_not_run, has_no_expected_output, messages
  if test_count == 0
    puts("No tests were run, please make sure this is the correct directory and it has input files under it somewhere unhidden.")
    exit 0
  else
    puts ""
    outmessage = "#{test_count} tests found. "
    if did_not_run > 0
      outmessage += "#{did_not_run} of them were not run"
      if has_no_expected_output == did_not_run
        outmessage += " due to not having an expected output.\n"
      elsif has_no_expected_output == 0
        outmessage += " due to unsuccessful termination.\n"
      else
        outmessage += ":\n  #{has_no_expected_output} of them because of no expected output\n  #{did_not_run - has_no_expected_output} of them because of unsuccessful termination.\n"
      end
    end
    outmessage += "Of the #{test_count - did_not_run} that ran, #{worked} passed."
    puts outmessage
  end
  
  if messages.length > 0
    if nolog
      puts "\n================================\nTEST FAILURES!\n\n"
      puts messages.join "\n-----------\n"
      puts "\n"
    end 
    exit 1
  else
    puts "GG, WP"
    exit 0
  end
end

# run a test, returning a value for a switch (to update various counts correctly) and message if it isn't forced to exit out
def handleTest(input_file)
  spec_dir = File.dirname input_file

  outfile = File.join spec_dir, "output.out"
  expected_file = File.join spec_dir, "expected_output.css"
  

  unless File.exists? expected_file #there is no expected_output.css file acompanying
    $stderr.puts "ERROR: #{input_file} has no accompanying expected_output.css, skipping test."
    return 1
  end

  `#{@options[:sass_executable]} #{input_file} > #{outfile} 2> /dev/null`

  if $?.to_i != 0 #cmd failed
    err_message = "Command '#{@options[:sass_executable]} #{input_file}' terminated unsuccessfully with error code #{$?.to_i}."
    $stderr.puts "ERROR: " + err_message
    `rm "#{outfile}"`
    if !@options[:skip]
      $stderr.puts("Exiting, make sure '#{@options[:sass_executable]}' is available from your $PATH or use the -s or --skip option to skip tests that fail to exit successfully.")
      exit 4
    end
    message = "Failed test in #{spec_dir}\n"
    message << err_message
    return 2
  end

  output_from_test = File.read outfile
  expected_output = File.read expected_file

  retval = 0
  if expected_output.strip != output_from_test.strip
    if @options[:verbose]
      puts "Failed for #{input_file}."
    else
      print "F" unless @options[:silent]
    end
    message = "Failed test in #{spec_dir}\n"
    message << `diff -rub #{expected_file} #{outfile}`
  else
    retval = 3
    if !@options[:only_display_failures]
      if @options[:verbose]
        puts "Passed for #{input_file}." 
      else
        print "." unless @options[:silent]
      end
    end
  end

  `rm "#{outfile}"`

  [retval, message]
end

def run
  unless @options[:silent]
    puts "Recursively searching under directory '#{@options[:spec_directory]}' for test files to test '#{@options[:sass_executable]}' with."
  end
  
  test_count = 0
  worked = 0
  did_not_run = 0
  has_no_expected_output = 0
  messages = []

  search_path = File.join(@options[:spec_directory], "**", "input.scss")

  Dir[search_path].each do |input_file|
    test_count += 1
    retval, msg = handleTest(input_file)
    case retval
    when 1
      did_not_run += 1
      has_no_expected_output += 1
    when 2
      did_not_run += 1
    when 3
      worked += 1
    end
    messages << msg if msg
  end

  puts messages unless @options[:silent]

  printResults @options[:silent], test_count, worked, did_not_run, has_no_expected_output, messages
end
end