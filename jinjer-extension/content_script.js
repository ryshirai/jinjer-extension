(() => {
  const extension = window.JINJER_EXTENSION;
  const hasRequiredModules =
    extension?.constants &&
    extension?.scanner &&
    extension?.modalDrag &&
    extension?.utils;

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

  const { startScanMonitoring } = extension.scanner;
  const { updateModalStacking, bindGlobalDragDelegation } = extension.modalDrag;
  const { COLOR_SETTING_KEYS, applyCustomColors } = extension.utils;

  const loadAndApplyColorSettings = () =>
    new Promise((resolve) => {
      chrome.storage.sync.get(COLOR_SETTING_KEYS, (settings) => {
        applyCustomColors(settings);
        resolve();
      });
    });

  console.log("Jinjer勤怠チェック拡張を開始しました。");

  loadAndApplyColorSettings().then(() => {
    startScanMonitoring({
      afterScan: () => {
        updateModalStacking();
        bindGlobalDragDelegation();
      },
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    const hasColorSettingChange = COLOR_SETTING_KEYS.some(
      (key) => key in changes,
    );
    if (!hasColorSettingChange) {
      return;
    }

    const updatedSettings = {};
    COLOR_SETTING_KEYS.forEach((key) => {
      if (key in changes) {
        updatedSettings[key] = changes[key].newValue;
      }
    });
    applyCustomColors(updatedSettings);
  });
})();
