module SassSpec
  class Interactor

    class Choice < Struct.new(:shortcut, :message, :block)
      def run_block!
        block.call if block
      end
    end

    def initialize(id = nil)
      @choices = []
      @choice = nil
      @id = id
    end

    def prompt(message)
      @prompt = message
    end

    def choice(shortcut, message, &block)
      @choices << Choice.new(shortcut, message, block)
    end

    def restart!
      @choice = nil
    end

    def display_choices!(memory)
      puts
      puts @prompt if @prompt
      @choices.each_with_index do |c, i|
        puts "#{c.shortcut}. #{c.message}"
      end
      if @id && memory
        puts "Note: If you end your choice with a ! then next time this happens,\n"+
             "we'll use that option without prompting you.\n"
      end
      print "Please select an option > "
    end

    def run!(memory = nil)
      if @id && memory && memory[@id]
        @choices.detect{|c| c.shortcut == memory[@id]}.run_block!
        return memory[@id]
      end
      if @choices.size == 0
        raise ArgumentError, "No choices to run."
      end
      @choice = nil
      until @choice
        display_choices!(memory)
        input = $stdin.gets.strip
        puts

        if input && input.end_with?("!")
          repeat = true
          input.slice!(-1)
        end

        @choice = input
        if (choice = @choices.find {|c| c.shortcut == @choice})
          choice.run_block! # We run this in the loop so restart! can be invoked.
        else
          @choice = nil
        end
      end
      @choice # we return the shortcut so re-ordering choices doesn't change result
    ensure
      if @id && memory && repeat && @choice
        memory[@id] = @choice
      end
    end

    def self.interact
      interactor = new
      yield interactor
      interactor.run!
    end

    def self.interact_with_memory(memory, id)
      interactor = new(id)
      yield interactor
      interactor.run!(memory)
    end
  end
end


