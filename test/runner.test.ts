import { runAllTests } from "../lib-js/runner"
import { Readable, Writable } from "stream"

class MemoryWritable extends Writable {
  chunks: string[] = []
  _write(chunk: any, enc: any, cb: () => void) {
    this.chunks.push(chunk.toString())
    cb()
  }
  contents() {
    return this.chunks.join("")
  }
}

function makeInputStream(inputs: string[]) {
  return Readable.from(inputs.map((input) => input + "\n"))
}

async function doRun() {
  const output = new MemoryWritable()
  await runAllTests({
    argv: [
      "--impl",
      "sass-mock",
      "--command",
      "./sass-mock",
      "--root-path",
      "./fixtures",
    ],
    input: makeInputStream([]),
    output,
  })
  return output.contents()
}

describe("runAllTests", () => {
  it("works when run normally", async () => {
    await doRun()
  })
})
