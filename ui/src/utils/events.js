const fetchEvents = async (client, deployBlockNumber, call) => {
  let foundOne = false
  let toBlock = await client.getBlockNumber()
  let allEvents = []
  while (true) {
    let fromBlock = toBlock - 1000n

    const events = await call({
      fromBlock,
      toBlock,
    })

    if ((events.length === 0 && foundOne) || fromBlock <= deployBlockNumber) break

    if (events.length > 0) {
      foundOne = true
      allEvents.push(...events)
    }

    toBlock = fromBlock - 1n
  }

  return allEvents
}

export {
    fetchEvents
}