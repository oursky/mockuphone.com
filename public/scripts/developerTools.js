function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

function main() {
  function handleIntersection(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate");
      }
    });
  }

  const observer = new IntersectionObserver(handleIntersection);

  /* 
    If we use css, there will be some extra delay that we don't want to have
    So use js to make the animation in mobile mode look smoother
  */
  setTimeout(() => {
    const formxaiCards = document.querySelector(".formxai-card");
    observer.observe(formxaiCards);
  }, 0);

  setTimeout(() => {
    const authgearCards = document.querySelector(".authgear-card");
    observer.observe(authgearCards);
  }, 200);

  setTimeout(() => {
    const makeappiconCards = document.querySelector(".makeappicon-card");
    observer.observe(makeappiconCards);
  }, 400);
}
