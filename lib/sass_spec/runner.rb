require 'pathname';

class SassSpec::Runner
  def initialize(options = {})
    @options = options
  end

  def printResults nolog, test_count, worked, did_not_run, has_no_expected_output, messages
    if test_count == 0
      puts("No tests were run, please make sure this is the correct directory and it has input files under it somewhere unhidden.")
      exit 99
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

    unless File.exists? expected_file #there is no accompanying expected_output.css file
      $stderr.puts "ERROR: #{input_file} has no accompanying expected_output.css, skipping test." unless @options[:tap]
      return 1
    end

    err_message=`#{@options[:sass_executable]} #{input_file} 2>&1 > #{outfile}`

    if !$?.success?
      `rm "#{outfile}"`
      unless @options[:tap]
        $stderr.puts "ERROR: " + err_message
        if !@options[:skip]
          $stderr.puts("Exiting, make sure '#{@options[:sass_executable]}' is available from your $PATH or use the -s or --skip option to skip tests that fail to exit successfully.")
          exit 4
        end
      end
      message = "Failed test in #{spec_dir}\n"
      message << err_message
      return 2, message
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
      message << err_message
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
      test_name = Pathname.new(input_file).relative_path_from(Pathname.new(@options[:spec_directory])).dirname.to_s
      test_name = (test_name == ".") ? @options[:spec_directory] : test_name
      is_todo = input_file.split("/").include?("todo")

      if !@options[:skip_todo] || !is_todo
        test_count += 1
        retval, msg = handleTest(input_file)
        case retval
        when 0
          puts "not ok #{test_count} # #{'TODO ' if is_todo}#{test_name}" if @options[:tap]
        when 1
          did_not_run += 1
          has_no_expected_output += 1
          puts "not ok #{test_count} # SKIP #{'TODO ' if is_todo}Missing expected_output.css for #{test_name}" if @options[:tap]
        when 2
          did_not_run += 1
          puts "not ok #{test_count} # #{'TODO ' if is_todo}#{test_name}" if @options[:tap]
        when 3
          worked += 1
          puts "ok #{test_count} # #{'TODO ' if is_todo}#{test_name}" if @options[:tap]
        end
        puts msg if @options[:tap] and msg
        messages << msg if msg
      else
        print "T" unless @options[:silent]
      end
    end

    if @options[:tap]
      puts "1..#{test_count}"
    else
      puts messages unless @options[:silent]

      printResults @options[:silent], test_count, worked, did_not_run, has_no_expected_output, messages
    end
  end
end
