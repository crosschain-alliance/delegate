import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'

const getNickname = (_address) => {
  const addressLowerCase = _address?.toLowerCase()

  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    seed: addressLowerCase,
    style: 'capital',
    separator: ' ',
    length: 2
  })
}

export { getNickname }