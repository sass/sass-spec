# This represents a specific test case.
class SassSpec::TestCase
  def initialize(input_scss, expected_css, options = {})
    @input = input_scss
    @expected = expected_css
    @options = options
  end

  def name
    return @input.dirname.to_s.sub(Dir.pwd + "/", "").gsub('/', '_')
  end

  def input_path
    return @input
  end

  def expected_path
    return @expected
  end

  def todo?
    return @input.to_s.include? @options[:todo_path]  
  end

  def output
    return _clean_output `#{@options[:sass_executable]} #{@input}`
  end

  def expected
    return _clean_output File.read(@expected)
  end

  def _clean_output(css)
    return css.gsub(/\s+/, "")
         .gsub("{", "\n{\n\t")
         .gsub(",", ", ")
         .gsub(";", ";\n\t")
         .gsub(/\t?}/, "}\n\n\n")
         .gsub(/\t([^:]+):/, "\t" + '\1: ')
  end
end