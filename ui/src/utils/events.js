const fetchEvents = async (client, deployBlockNumber, find, call) => {
  let found = 0 
  let toBlock = await client.getBlockNumber()
  let allEvents = []
  while (true) {
    let fromBlock = toBlock - 1000n

    const events = await call({
      fromBlock,
      toBlock,
    })

    if ((events.length === 0 && found >= find) || fromBlock <= deployBlockNumber) break

    
    if (events.length > 0) {
      found++
      allEvents.push(...events)
    }

    toBlock = fromBlock - 1n
  }

  return allEvents
}

export {
    fetchEvents
}