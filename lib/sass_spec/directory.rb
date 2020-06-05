require 'fileutils'
require 'hrx'
require 'pathname'
require 'set'

require_relative 'util'

# A directory that may represent either a physical directory on disk or a
# directory within an HRX::Archive.
class SassSpec::Directory
  # A cache of parsed HRX files, indexed by their corresponding directory paths.
  def self._hrx_cache
    @hrx_cache ||= {}
  end

  # The directory's path, possibly including components within an HRX file.
  attr_reader :path

  # Returns whether this is a virtual HRX directory.
  def hrx?
    !!@archive
  end

  # Creates a Directory from a `path`, which may go into an HRX file. For
  # example, if `path` is `path/to/archive/subdir` and `path/to/archive.hrx`
  # exists, this will load `subdir` from within `path/to/archive.hrx`.
  def initialize(path)
    @path = Pathname.new(path)
    @path = @path.relative_path_from(Pathname.new(Dir.pwd)) if @path.absolute?

    # Always use forward slashes on Windows, because HRX requires them.
    @path = Pathname.new(@path.to_s.gsub(/\\/, '/')) if Gem.win_platform?

    if %w[.. .].include?(@path.each_filename.first)
      raise ArgumentError.new("#{path} must be beneath the working directory")
    end

    return if Dir.exist?(@path)

    SassSpec::Util.each_directory(@path).with_index do |dir, i|
      archive_path = dir + ".hrx"
      if self.class._hrx_cache[dir] || File.exist?(archive_path)
        @parent_archive_path = archive_path
        @parent_archive = self.class._hrx_cache[dir] ||= HRX::Archive.load(archive_path)

        @path_in_parent = @path.each_filename.drop(i + 1).join("/")
        @archive =
          if @path_in_parent.empty?
            @parent_archive
          else
            @parent_archive.child_archive(@path_in_parent)
          end

        return
      end
    end

    raise ArgumentError.new("#{path} doesn't exist")
  end

  # Returns the parent as a SassSpec::Directory, or `nil` if this is the root
  # spec directory.
  def parent
    dirname = File.dirname(@path)
    dirname == "." ? nil : SassSpec::Directory.new(dirname)
  end

  # Returns a list of all paths in this directory that match `pattern`, relative
  # to the directory root.
  #
  # This includes files within HRX files in this directory.
  def glob(pattern)
    if hrx?
      @archive.glob(pattern).select {|e| e.is_a?(HRX::File)}.map(&:path)
    else
      recursive = pattern.include?("**")
      physical_pattern =
        if recursive
          "{#{File.join(@path, pattern)},#{File.join(@path, '**/*.hrx')}}"
        else
          File.join(@path, pattern)
        end

      seen = Set.new
      Dir.glob(physical_pattern, File::FNM_EXTGLOB).flat_map do |path|
        # Dir.glob() can emit the same path multiple times if multiple `{}`
        # patterns cover it.
        next [] if seen.include?(path)
        seen << path

        next [] if Dir.exists?(path)

        absolute = Pathname.new(path).expand_path
        relative = absolute.relative_path_from(@path.expand_path).to_s
        next relative unless recursive && path.end_with?(".hrx")

        dir = path[0...-".hrx".length]
        relative_dir = relative[0...-".hrx".length]
        archive = self.class._hrx_cache[dir] ||= HRX::Archive.load(path)
        archive.glob(pattern).map {|inner| "#{relative_dir}/#{inner.path}"}
      end
    end
  end

  # Returns whether a file exists at `path` within this directory.
  def file?(path)
    if hrx?
      @archive[path].is_a?(HRX::File)
    elsif (dir, basename = split_if_nested(path))
      dir.file?(basename)
    else
      File.exist?(File.join(@path, path))
    end
  rescue ArgumentError, HRX::Error
    # If we get a directory-doesn't-exist error for a nested directory, return
    # false. This could catch unrelated errors, but it's probably not likely
    # enough to be worth creating a custom exception class.
    return false
  end

  # Reads the file at `path` within this directory.
  def read(path)
    if hrx?
      @archive.read(path)
    elsif (dir, basename = split_if_nested(path))
      dir.read(basename)
    else
      File.read(File.join(@path, path), binmode: true, encoding: "ASCII-8BIT")
    end
  end

  # Writes `contents` to `path` within this directory.
  def write(path, contents)
    if hrx?
      @archive.write(path, contents, comment: :copy)
      _write!
    elsif (dir, basename = split_if_nested(path))
      dir.write(basename, contents)
    else
      File.write(File.join(@path, path), contents, binmode: true)
    end
  end

  # Deletes the file at `path` within this directory.
  #
  # If `if_exists` is `true`, don't throw an error if the file doesn't exist.
  def delete(path, if_exists: false)
    return if if_exists && !file?(path)
    if hrx?
      @archive.delete(path)
      _write!
    elsif (dir, basename = split_if_nested(path))
      dir.delete(basename, if_exists: if_exists)
    else
      File.unlink(File.join(@path, path))
    end
  end

  # Renames the file at `old` to `new`.
  def rename(old, new)
    old_dir, old_basename = split_if_nested(old) || [self, old]
    new_dir, new_basename = split_if_nested(new) || [self, new]

    if old_dir.hrx? && new_dir.hrx?
      unless old_file = old_dir.archive[old_basename]
        raise "#@path/old doesn't exist"
      end

      new_dir.archive.add(
        HRX::File.new(new_basename, old_file.content, comment: old_file.comment),
        after: new_dir == old_dir ? old_file : nil)
      new_dir._write!

      old_dir.delete(old_basename)
    else
      new_dir.write(new_basename, old_dir.read(old_basename))
      old_dir.delete(old_basename)
    end
  end

  # Deletes this directory and everything it contains.
  def delete_dir!
    if hrx?
      if @parent_archive.equal?(@archive)
        _delete_parent!
      else
        @parent_archive.delete(@path_in_parent, recursive: true)
        _write!
      end
    else
      FileUtils.rm_rf(@path)
    end
  end

  # If this directory refers to an HRX file, runs a block with the archive's
  # directory and all its contents physically present on the filesystem next to
  # the archive.
  #
  # If this is a normal directory, runs the block with the filesystem as-is.
  def with_real_files
    return yield unless @archive

    files = @archive.entries.select {|entry| entry.is_a?(HRX::File)}.to_a
    if parent.hrx? && files.any? {|file| _reaches_out?(file)}
      return parent.with_real_files {yield}
    end

    outermost_new_dir = SassSpec::Util.each_directory(@path).find {|dir| !Dir.exist?(dir)}

    files.each do |file|
      path = File.join(@path, file.path)
      FileUtils.mkdir_p(File.dirname(path))
      File.write(path, file.content)
    end
    yield
  ensure
    FileUtils.rm_rf(outermost_new_dir) if outermost_new_dir
  end

  # Returns an HRX representation of this directory.
  def to_hrx
    archive = HRX::Archive.new
    glob("**/*").each do |path|
      archive << HRX::File.new("#{self.path}/#{path}", read(path))
    end
    archive.to_hrx
  end

  def inspect
    "#<SassSpec::Directory:#{@path}>"
  end

  def to_s
    @path.to_s
  end

  protected

  # The directory's underlying HRX archive. `nil` if `hrx?` is `false`.
  attr_reader :archive

  # Writes `@parent_archive` to disk.
  def _write!
    if @parent_archive.entries.empty?
      _delete_parent!
    else
      @parent_archive.write!(@parent_archive_path)
    end
  end

  private

  # If `path` points to a subdirectory of this directory, returns the nested
  # `Directory` object and the basename of the file. Otherwise, returns `nil`.
  def split_if_nested(path)
    dirname, basename = File.split(path)
    dirname == '.' ? nil : [SassSpec::Directory.new(@path.join(dirname)), basename]
  end

  # Returns whether `file` contains enough `../` references to reach outside
  # this directory.
  def _reaches_out?(file)
    depth = file.path.count("/")
    file.content.scan(%r{(?:\.\./)+}).any? {|match| match.count("/") > depth}
  end

  # Deletes `@parent_archive` from disk and from the archive cache.
  def _delete_parent!
    File.unlink(@parent_archive_path)
    self.class._hrx_cache.delete(@parent_archive_path.sub(/\.hrx$/, ''))
  end
end
