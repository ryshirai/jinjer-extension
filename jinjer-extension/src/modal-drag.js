(() => {
  const extension = window.JINJER_EXTENSION;
  if (!extension?.constants) {
    console.error("Jinjer拡張のモーダル移動機能を初期化できません。定数モジュールが不足しています。");
    return;
  }

  const { SELECTORS, BASE_MODAL_Z_INDEX, DRAG_MODAL_Z_INDEX } = extension.constants;

  let activeDrag = null;
  let isDelegatedHandlerBound = false;

  const updateModalStacking = () => {
    document.querySelectorAll(SELECTORS.modal.wrapper).forEach((modal) => {
      const zIndex = activeDrag && activeDrag.modal === modal ? DRAG_MODAL_Z_INDEX : BASE_MODAL_Z_INDEX;
      modal.style.setProperty("z-index", zIndex, "important");
    });
  };

  // Jinjerの親要素の影響を受けないように、モーダルを画面固定座標へ置き直す。
  const freezeModalToViewport = (modal, modalRect) => {
    modal.style.setProperty("position", "fixed", "important");
    modal.style.setProperty("left", `${modalRect.left}px`, "important");
    modal.style.setProperty("top", `${modalRect.top}px`, "important");
    modal.style.setProperty("transform", "none", "important");
    modal.style.setProperty("margin", "0", "important");
    modal.style.setProperty("right", "auto", "important");
    modal.style.setProperty("bottom", "auto", "important");
    modal.style.setProperty("z-index", DRAG_MODAL_Z_INDEX, "important");
  };

  const startDrag = (event, modal) => {
    const modalRect = modal.getBoundingClientRect();
    const offsetX = event.clientX - modalRect.left;
    const offsetY = event.clientY - modalRect.top;

    freezeModalToViewport(modal, modalRect);

    activeDrag = { modal };
    updateModalStacking();

    const onMouseMove = (moveEvent) => {
      modal.style.setProperty("left", `${moveEvent.clientX - offsetX}px`, "important");
      modal.style.setProperty("top", `${moveEvent.clientY - offsetY}px`, "important");
      moveEvent.preventDefault();
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      activeDrag = null;
      updateModalStacking();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp, { once: true });
    event.preventDefault();
  };

  const bindGlobalDragDelegation = () => {
    if (isDelegatedHandlerBound) {
      return;
    }

    isDelegatedHandlerBound = true;

    document.addEventListener(
      "mousedown",
      (event) => {
        if (event.button !== 0) {
          return;
        }

        if (event.target?.closest?.(SELECTORS.modal.closeButton)) {
          return;
        }

        const titleBar = event.target?.closest?.(SELECTORS.modal.titleBar);
        if (!titleBar) {
          return;
        }

        const modal = titleBar.closest(SELECTORS.modal.wrapper);
        if (!modal) {
          return;
        }

        startDrag(event, modal);
      },
      true,
    );
  };

  window.JINJER_EXTENSION = {
    ...window.JINJER_EXTENSION,
    modalDrag: {
      updateModalStacking,
      bindGlobalDragDelegation,
    },
  };
})();
