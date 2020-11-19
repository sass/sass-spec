// TODO consider more events
// e.g. uncaught exceptions, SIGUSR1, SIGUSR2, SIGTERM
const events = ["beforeExit", "exit", "SIGINT"]

/**
 * Call the function `cb`, ensuring that the `cleanup` function is called
 * on any error or interrupt.
 *
 * @param cleanup the asynchronous cleanup function
 * @param cb the function to clean up after
 */
export async function withAsyncCleanup(
  cleanup: () => Promise<void>,
  cb: () => Promise<void>
) {
  // Cleanup callbacks must be synchronous,
  // so trigger an async function that exits the process
  const cleanupAndExit = async (status: number = 0) => {
    // cleanup and then trigger an exit
    await cleanup()
    process.exit(status)
  }

  const handler = () => {
    cleanupAndExit()
  }

  for (const event of events) {
    process.on(event, handler)
  }

  try {
    await cb()
  } finally {
    for (const event of events) {
      process.removeListener(event, handler)
    }
    await cleanup()
  }
}