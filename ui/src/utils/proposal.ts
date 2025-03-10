const parseProposalText = (text: string) => {
  const multilineText = text.replace(/(#+)\s+/g, '\n$1 ');
  return parseProposal(multilineText);
}


const parseProposal = (text: string) => {
  const titleMatch = text.match(/^#\s+(.*)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const typeMatch = text.match(/^###\s+(.*)$/m);
  const type = typeMatch ? typeMatch[1].trim() : '';

  function extractSection(headingRegex) {
    const match = text.match(headingRegex);
    return match ? match[1].trim() : '';
  }

  const abstract = extractSection(/##\s+Abstract([^]+?)(?=^##|\Z)/m);
  const motivation = extractSection(/##\s+(?:Motivation\/Rationale|Motivation|Rationale)([^]+?)(?=^##|\Z)/m);
  const budget = extractSection(/##\s+Budget([^]+?)(?=^##|\Z)/m);
  const timeline = extractSection(/##\s+Timeline([^]+?)(?=^##|\Z)/m);
  const conflictsOfInterest = extractSection(/##\s+Conflicts of Interest([^]+?)(?=^##|\Z)/m);

  return {
    title,
    type,
    abstract,
    motivation,
    budget,
    timeline,
    conflictsOfInterest
  };
}

const discardUselessTextFromProposal = (text: string) => {
  const firstHashIndex = text.indexOf('#');
  const marker = "Consider to return a result based on the following interests:";
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    return text;
  }
  return text.slice(firstHashIndex, markerIndex).trim();
}

export {
  parseProposalText,
  discardUselessTextFromProposal
}