import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { DartCompiler } from "../lib-js/compiler"

describe("DartCompiler", () => {
  it("gracefully handles an executable that crashes on launch", async () => {
    const fakeRepo = await fs.mkdtemp(path.join(os.tmpdir(), "sass-spec-"))
    try {
      await fs.mkdir(path.join(fakeRepo, "bin"))
      await fs.writeFile(
        path.join(fakeRepo, "bin", "sass.dart"),
        "invalid Dart code"
      )
      await fs.writeFile(path.join(fakeRepo, ".packages"), "")

      await expect(DartCompiler.fromRepo(fakeRepo)).rejects.toThrow(
        /Dart Sass process exited unexpectedly/
      )
    } finally {
      await fs.rm(fakeRepo, { recursive: true, force: true })
    }
  })
})
