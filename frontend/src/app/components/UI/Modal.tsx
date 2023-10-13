"use client";

import { ReactNode, useEffect, useRef, forwardRef, ForwardedRef } from "react";
import { createPortal } from "react-dom";

const Modal = forwardRef(
  (
    { children, onClose }: { children: ReactNode; onClose: () => void },
    ref: ForwardedRef<HTMLDialogElement>
  ) => {
    const dialog = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
      const modal = dialog.current;
      if (modal) {
        modal.showModal();

        if (onClose) {
          modal.addEventListener("close", onClose);
        }

        return () => {
          modal.close();
          modal.removeEventListener("close", onClose);
        };
      }
    }, [onClose]);

    const modalRoot = document.getElementById("modal");

    if (!modalRoot) {
      return null; // Return null if the "modal" element doesn't exist
    }

    return createPortal(
      <dialog className="modal" ref={ref}>
        {children}
      </dialog>,
      modalRoot
    );
  }
);

export default Modal;
