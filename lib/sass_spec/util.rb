module SassSpec::Util
  class << self
    # Normalizes the whitespace in the given CSS to make it easier to compare
    # across implementations.
    def normalize_output(css)
      css.gsub(/(?:\r?\n)+/, "\n")
    end

    # Normalizes the path names and whitespace in the given error message.
    def normalize_error(error)
      # TODO(nweiz): Delete path normalization when sass/libsass#2861 is fixed.
      error.gsub(/(?:\/todo_|_todo\/)/, "/") # hide todo pre/suffix
        .gsub(/\/libsass\-[a-z]+\-tests\//, "/") # hide test directory
        .gsub(/\/libsass\-[a-z]+\-issues\//, "/libsass-issues/") # normalize issue specs
        .gsub(/(([\w\/.\-\\:]+?[\/\\])|([\/\\]|(?!:\s)))spec[\/\\]+/, "/sass/spec/") # normalize abs paths
        .sub(/(?:\r?\n)*\z/, "\n") # make sure we have exactly one trailing linefeed
        .sub(/\A(?:\r?\s)+\z/, "") # clear the whole file if only whitespace
        .gsub(/\r\n/, "\n") # remove Windows line feeds
    end

    # Yields each directory in `path`, from the outermost to the innermost.
    def each_directory(path)
      return to_enum(__method__, path) unless block_given?

      path_so_far = nil
      Pathname.new(path).each_filename do |dir|
        if path_so_far.nil?
          path_so_far = String.new(dir)
        else
          path_so_far << File::SEPARATOR << dir
        end
        yield path_so_far
      end
    end
  end
end
