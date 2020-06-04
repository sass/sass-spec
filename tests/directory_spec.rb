# coding: utf-8
# frozen_string_literal: true

require_relative 'spec_helper'
require 'sass_spec'

RSpec::Matchers.define_negated_matcher :not_include, :include

describe SassSpec::Directory do
  include_context :uses_fs
  after(:each) { SassSpec::Directory._hrx_cache.clear }

  def directory(folder=nil)
    SassSpec::Directory.new(dir(folder))
  end

  context 'in a real directory' do
    before(:each) { FileUtils.mkdir_p 'spec' }

    it "throws an error if the path doesn't exist" do
      expect { directory('foo') }.to raise_error("spec/foo doesn't exist")
    end

    it 'throws an error if the path is the working directory' do
      expect { SassSpec::Directory.new('.') }.to raise_error(". must be beneath the working directory")
    end

    it 'throws an error if the path is outside the working directory' do
      FileUtils.mkdir_p '/foo/bar/baz'
      Dir.chdir '/foo/bar/baz'
      expect { SassSpec::Directory.new('/foo') }.to raise_error("/foo must be beneath the working directory")
    end

    describe '#path' do
      it 'return the path relative to the working directory' do
        expect(directory.path).to be == Pathname.new(dir)
      end

      it 'return a relative path even if passed an absolute path' do
        expect(SassSpec::Directory.new(File.expand_path(dir)).path).to be == Pathname.new(dir)
      end

      it 'uses forward slashes even on Windows' do
        FileUtils.mkdir_p dir('foo/bar/baz')
        expect(directory('foo/bar/baz').path.to_s).to include('/').and not_include("\\")
      end
    end

    describe '#hrx?' do
      it 'return false' do
        expect(directory.hrx?).to be false
      end
    end

    describe '#parent' do
      it 'returns nil if the parent is the cwd' do
        expect(directory.parent).to be nil
      end

      it 'returns a new directory' do
        FileUtils.mkdir_p dir('foo/bar/baz')
        expect(directory('foo/bar/baz').parent.to_s).to be == 'spec/foo/bar'
      end
    end

    describe '#glob' do
      # TODO(nweiz): Write these specs.
    end

    describe '#file?' do
      it 'returns true if the given file exists' do
        File.write(dir('qux.txt'), 'hello!')
        expect(directory.file?('qux.txt')).to be true
      end

      it 'treats the path as relative to the directory' do
        FileUtils.mkdir_p dir('foo/bar/baz')
        File.write(dir('foo/bar/baz/qux.txt'), 'hello!')
        expect(directory('foo/bar/baz').file?('qux.txt')).to be true
      end

      it "returns false if the given file doesn't exist" do
        expect(directory.file?('qux.txt')).to be false
      end

      it "returns false if a directory with the given name exists" do
        FileUtils.mkdir dir('subdir')
        expect(directory.file?('qux.txt')).to be false
      end
    end

    describe '#read' do
      it 'returns the contents of the given file' do
        File.write(dir('qux.txt'), 'hello!')
        expect(directory.read('qux.txt')).to be == 'hello!'
      end

      it 'treats the path as relative to the directory' do
        FileUtils.mkdir_p dir('foo/bar/baz')
        File.write(dir('foo/bar/baz/qux.txt'), 'hello!')
        expect(directory('foo/bar/baz').read('qux.txt')).to be == 'hello!'
      end

      context 'with a real filesystem' do
        # FakeFS doesn't seem to respect `File.read()`'s encoding.
        include_context :uses_real_fs

        it 'reads the file as binary' do
          FileUtils.mkdir_p 'spec'
          File.write('spec/qux.txt', '👭')
          expect(SassSpec::Directory.new('spec').read('qux.txt'))
            .to be == '👭'.dup.force_encoding('ASCII-8BIT')
        end
      end

      it "throws an error if the file doesn't exist" do
        expect { directory.read('qux.txt') }.to raise_error /No such file or directory/
      end
    end

    describe '#write' do
      # TODO(nweiz): Write these specs.
    end

    describe '#delete' do
      # TODO(nweiz): Write these specs.
    end

    describe '#rename' do
      # TODO(nweiz): Write these specs.
    end

    describe '#delete_dir!' do
      # TODO(nweiz): Write these specs.
    end

    describe '#with_real_files' do
      # TODO(nweiz): Write these specs.
    end

    describe '#to_hrx' do
      # TODO(nweiz): Write these specs.
    end
  end

  context 'in an HRX directory' do
    # TODO(nweiz): Write these specs.
  end
end
