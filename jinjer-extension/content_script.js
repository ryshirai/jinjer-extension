(() => {
  const extension = window.JINJER_EXTENSION;
  const hasRequiredModules =
    extension?.constants && extension?.scanner && extension?.modalDrag;

  if (!hasRequiredModules) {
    console.error("Jinjer拡張の初期化に失敗しました。必要モジュールが不足しています。");
    return;
  }

  const { TARGET_ORIGIN, TARGET_PATH } = extension.constants;
  const isTargetPage =
    window.location.origin === TARGET_ORIGIN &&
    window.location.pathname === TARGET_PATH;

  // 対象ページ以外では何もしない。
  if (!isTargetPage) {
    return;
  }

  const { scanRows } = extension.scanner;
  const { updateModalStacking, bindGlobalDragDelegation } = extension.modalDrag;

  console.log("Jinjer勤怠チェック拡張を開始しました。");

  // DOM更新が連続したときに、1フレームで1回だけ再走査する。
  let isScanScheduled = false;
  const scheduleScan = () => {
    if (isScanScheduled) {
      return;
    }

    isScanScheduled = true;
    requestAnimationFrame(() => {
      isScanScheduled = false;
      scanRows();
      updateModalStacking();
      bindGlobalDragDelegation();
    });
  };

  // 初回実行
  scanRows();
  updateModalStacking();
  bindGlobalDragDelegation();

  // テーブルやモーダル更新を監視して再評価する。
  const observer = new MutationObserver(() => {
    scheduleScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
