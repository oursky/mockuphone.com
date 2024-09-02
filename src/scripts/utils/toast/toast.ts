import StartToastifyInstance from "toastify-js";
import Toastify from "toastify-js";
import "./toast.css";

interface ToastOptions extends StartToastifyInstance.Options {
  description: string;
  title?: string;
}

function updateCloseButton() {
  const closeButtonNode = document.querySelector(".toast-close");
  if (closeButtonNode) {
    closeButtonNode.innerHTML = "<img src='/images/close.svg' >";
  }
}

export function showToast(options: ToastOptions) {
  const { description, avatar, title } = options;
  const toastNode = document.createElement("div");
  const toastHeader = document.createElement("div");
  const toastMessage = document.createElement("div");

  toastHeader.classList.add("toast-header");
  toastHeader.innerHTML = `${avatar ? `<img src="${avatar}">` : ""}<span>${
    title ?? ""
  }</span>`;

  toastMessage.classList.add("toast-content");
  toastMessage.innerHTML = description;
  toastNode.appendChild(toastHeader);
  toastNode.appendChild(toastMessage);

  Toastify({
    node: toastNode,
    style: {
      display: "flex",
      background: "white",
      color: "black",
      alignItems: "start",
      justifyContent: "start",
      boxShadow: "0px 4px 20px 0px rgba(0, 0, 0, 0.3)",
      borderRadius: "10px",
      padding: "20px",
    },
    onClick: function () {},
    duration: 3000,
    close: true,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    ...options,
  }).showToast();

  updateCloseButton();
}
