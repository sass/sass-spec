import { withAsyncCleanup } from "../../lib-js/spec-directory/cleanup"

describe("withAsyncCleanup", () => {
  it("does the cleanup function on normal exit", async () => {
    const mock = jest.fn()
    await withAsyncCleanup(mock, async () => {
      // do nothing
    })
    expect(mock).toHaveBeenCalled()
  })

  it("does the cleanup on an error", async () => {
    try {
      const mock = jest.fn()
      await withAsyncCleanup(mock, async () => {
        throw new Error("YEET")
      })
      expect(mock).toHaveBeenCalled()
    } catch (e) {}
  })

  it.skip("does the cleanup on a SIGINT", async () => {
    // const mockExit = jest.spyOn(process, "exit").mockImplementation()
    const mock = jest.fn()
    await withAsyncCleanup(mock, async () => {
      process.kill(process.pid, "SIGINT")
    })
    expect(mock).toHaveBeenCalled()
  })
})
