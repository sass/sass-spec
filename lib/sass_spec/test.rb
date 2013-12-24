# This represents a specific test case.


class SassSpec::Test
  STATUSES = {
    :passed  => ".",
    :failed  => "F",
    :error   => "!",
    :unknown => "?", # hasn't run
    :todo_failed => "T",
    :todo_passed => "^" }

  # Pass in the directory you are expecting to run in
  def initialize(file)
    @path  = File.dirname(file)
  end

  def status
    @stutus ||= :unknown
  end

  def is_todo?
    @is_todo ||= @path.split("/").include?("todo")
  end

  def path
    @path
  end

  def input_file
    File.join(@path, "input.scss")
  end

  def input
    @input ||= File.read(input_file).to_s
  end

  def expected_output_file
    File.join(@path, "expected_output.css")
  end

  def expected_output
    @expected_output ||= File.read(expected_output_file).to_s
  end

  def message
    @message ||= ""
  end

  def error?
    @status == :error
  end

  def output
    @output
  end

  def generate_output!(cmd = nil)
    if cmd
      @output = `#{cmd} #{input_file}`
      if !$?.success?
        @status = :error
        @message = $?.to_s
      end
    else
      @output = Sass::Engine.new(input, :syntax => :scss).render
    end
  end
end