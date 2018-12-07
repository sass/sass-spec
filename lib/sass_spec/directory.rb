require 'fileutils'
require 'hrx'
require 'pathname'

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
    @path = @path.relative_path_from(Pathname.new(Dir.pwd)) if Pathname.new(path).absolute?

    # Always use forward slashes on Windows, because HRX requires them.
    @path = Pathname.new(@path.to_s.gsub(/\\/, '/')) if Gem.win_platform?

    raise ArgumentError.new("#{@path} must be relative.") if @path.absolute?

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

    raise "#{path} doesn't exist"
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
      physical_pattern = recursive ? "{#{pattern},**/*.hrx}" : pattern
      Dir.glob(File.join(@path, physical_pattern), File::FNM_EXTGLOB).flat_map do |path|
        relative = Pathname.new(path).relative_path_from(@path).to_s
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
    else
      File.exist?(File.join(@path, path))
    end
  end

  # Reads the file at `path` within this directory.
  def read(path)
    return @archive.read(path) if hrx?
    File.read(File.join(@path, path), binmode: true, encoding: "ASCII-8BIT")
  end

  # Writes `contents` to `path` within this directory.
  def write(path, contents)
    if hrx?
      @archive.write(path, contents, comment: :copy)
      _write!
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
    else
      File.unlink(File.join(@path, path))
    end
  end

  # Renames the file at `old` to `new`.
  def rename(old, new)
    if hrx?
      unless old_file = @archive[old]
        raise "#@path/old doesn't exist"
      end

      @archive.add(HRX::File.new(new, old_file.contents, comment: old_file.comment),
                   after: old_file)
      @archive.delete(old)
      _write!
    else
      File.rename(File.join(@path, old), File.join(@path, new))
    end
  end

  # Deletes this directory and everything it contains.
  def delete_dir!
    if hrx?
      if @parent_archive.equal?(@archive)
        _delete_parent!
      else
        @parent_archive.delete(@path_in_parent, recursive: true)
        if @parent_archive.entries.empty?
          _delete_parent!
        else
          _write!
        end
      end
    else
      FileUtils.rm_rf(@path)
    end
  end

  # If this directory refers to an HRX file, runs a block the that archive's
  # directory and all its contents physically present on the filesystem.
  #
  # If this is a normal directory, runs the block in the normal context.
  def with_real_files
    return yield unless @archive

    outermost_new_dir = SassSpec::Util.each_directory(@path).find {|dir| !Dir.exist?(dir)}

    @archive.entries.select {|entry| entry.is_a?(HRX::File)}.each do |file|
      path = File.join(@path, file.path)
      FileUtils.mkdir_p(File.dirname(path))
      File.write(path, file.content)
    end
    yield
  ensure
    FileUtils.rm_rf(outermost_new_dir) if outermost_new_dir
  end

  def inspect
    "#<SassSpec::Directory:#{@path}>"
  end

  def to_s
    @path.to_s
  end

  private

  # Writes `@parent_archive` to disk.
  def _write!
    @parent_archive.write!(@parent_archive_path)
  end

  # Deletes `@parent_archive` from disk and from the archive cache.
  def _delete_parent!
    File.unlink(@parent_archive_path)
    self.class._hrx_cache.delete(@parent_archive_path.sub(/\.hrx$/, ''))
  end
end
