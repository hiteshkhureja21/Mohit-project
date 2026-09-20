export function highlightMatchingText(fullText: string, searchPhrase: string): { before: string; match: string; after: string } {
  if (!searchPhrase || !fullText) {
    return { before: fullText, match: '', after: '' };
  }
  const index = fullText.toLowerCase().indexOf(searchPhrase.toLowerCase());
  if (index === -1) {
    return { before: fullText, match: '', after: '' };
  }
  return {
    before: fullText.slice(0, index),
    match: fullText.slice(index, index + searchPhrase.length),
    after: fullText.slice(index + searchPhrase.length),
  };
}
