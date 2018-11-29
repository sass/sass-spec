module SassSpec::Util
  class << self
    # Normalizes the whitespace in the given CSS to make it easier to compare
    # across implementations.
    def normalize_output(css)
      css.gsub(/(?:\r?\n)+/, "\n")
    end

    # Normalizes the path names and whitespace in the given error message.
    def normalize_error(error)
      error.gsub(/(?:\/todo_|_todo\/)/, "/") # hide todo pre/suffix
        .gsub(/\/libsass\-[a-z]+\-tests\//, "/") # hide test directory
        .gsub(/\/libsass\-[a-z]+\-issues\//, "/libsass-issues/") # normalize issue specs
        .gsub(/(([\w\/.\-\\:]+?[\/\\])|([\/\\]|(?!:\s)))spec[\/\\]+/, "/sass/spec/") # normalize abs paths
        .sub(/(?:\r?\n)*\z/, "\n") # make sure we have exactly one trailing linefeed
        .sub(/\A(?:\r?\s)+\z/, "") # clear the whole file if only whitespace
        .gsub(/\r\n/, "\n") # remove Windows line feeds
    end
  end
end
