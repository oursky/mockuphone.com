function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

function main() {
  const mobileShareBtn = document.querySelector(".header__share-small");
  const defaultShareSection = document.querySelector(".header__share-default");
  const isSupportShareApi = navigator.share != null;

  if (!isSupportShareApi) {
    // Regardless of screen width, hide native mobile share section which require share api, show default share section
    mobileShareBtn.classList.remove("d-block", "d-sm-none");
    mobileShareBtn.classList.add("d-none");
    defaultShareSection.classList.remove("d-none", "d-sm-block");
  }

  mobileShareBtn.addEventListener("click", () => {
    if (!navigator.share) {
      alert("Your browser does not support native sharing yet.");
      return;
    }
    navigator.share({
      url: "https://mockuphone.com",
      title: "MockuPhone",
      text: "One click to wrap your app screenshots in device mockup!",
    });
  });
}
