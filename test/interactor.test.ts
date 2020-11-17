import path from "path"
import { Interactor } from "../lib-js/interactor"
import { Readable, Writable } from "stream"
import { fromPath } from "../lib-js/spec-path"
import { FailTestResult } from "../lib-js/test-case"

class MemoryWritable extends Writable {
  chunks: string[] = []
  _write(chunk: string, enc: any, cb: () => void) {
    this.chunks.push(chunk.toString())
    cb()
  }
  contents() {
    return this.chunks.join("")
  }
}

describe("Interactor", () => {
  it("displays an input prompt with options", async () => {
    const input = Readable.from("f\n")
    const output = new MemoryWritable()
    const interactor = new Interactor(input, output)
    const dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
    const result: FailTestResult = {
      type: "fail",
      failureType: "unexpected_error",
      message: "Test case should succeed but it did not",
      actual: {
        isSuccess: false,
        error: "",
      },
    }
    const newResult = await interactor.run({ impl: "sass-mock", dir, result })
    expect(newResult).toEqual(result)
    expect(output.contents()).toContain("Please select an option >")
  })

  it.todo("displays the right options for each failure type")

  it.todo("displays options again if a print option is chosen")

  it.todo("exits the loop with the answer if a non-thing statement is chosen")

  it.todo("keeps track of chosen options")

  it.todo("handles each option correctly")
})
