import StartToastifyInstance from "toastify-js";
import Toastify from "toastify-js";
import "./toast.css";

interface ToastOptions extends StartToastifyInstance.Options {
  description: string;
  title?: string;
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
    },
    onClick: function () {},
    duration: 3000,
    close: true,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    ...options,
  }).showToast();
}
