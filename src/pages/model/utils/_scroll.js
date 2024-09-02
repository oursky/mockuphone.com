export function scrollToElementTop(htmlElement, header_offset) {
  // https://javascript.info/coordinates#getCoords
  const { top } = htmlElement.getBoundingClientRect();
  window.scrollTo({
    top: top + window.scrollY - header_offset,
    behavior: "smooth",
  });
}
