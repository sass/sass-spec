module SassSpec
  class Interactor

    class Choice < Struct.new(:label, :message, :block)
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

    def choice(label, message, &block)
      @choices << Choice.new(label, message, block)
    end

    def restart!
      @choice = nil
    end

    def display_choices!(memory)
      puts
      puts @prompt if @prompt
      @choices.each_with_index do |c, i|
        puts "#{i + 1}. #{c.message}"
      end
      if @id && memory
        puts "Note: If you end your choice with a ! then next time this happens,\n"+
             "we'll use that option without prompting you.\n"
      end
      print "Please select an option > "
    end

    def run!(memory = nil)
      if @id && memory && memory[@id]
        @choices.detect{|c| c.label == memory[@id]}.run_block!
        return memory[@id]
      end
      if @choices.size == 0
        raise ArgumentError, "No choices to run."
      end
      @choice = nil
      until @choice
        display_choices!(memory)
        input = $stdin.gets
        puts
        repeat = input && input.strip.end_with?("!")
        @choice = input ? input.strip.to_i : 0
        if @choice > 0 && @choice <= @choices.size
          @choices[@choice - 1].run_block! # We run this in the loop so restart! can be invoked.
        else
          @choice = nil
        end
      end
      @choices[@choice - 1].label # we return the label so re-ordering choices doesn't change result
    ensure
      if @id && memory && repeat && @choice
        memory[@id] = @choices[@choice - 1].label
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


