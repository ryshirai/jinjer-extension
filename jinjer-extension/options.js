(() => {
  const COLOR_FIELDS = [
    {
      key: "--jinjer-row-bg",
      inputId: "jinjer-row-bg",
      defaultValue: "#fff3f3",
    },
    {
      key: "--jinjer-row-border",
      inputId: "jinjer-row-border",
      defaultValue: "#dc2626",
    },
    {
      key: "--jinjer-cell-bg",
      inputId: "jinjer-cell-bg",
      defaultValue: "#ffe3e3",
    },
    {
      key: "--jinjer-cell-border",
      inputId: "jinjer-cell-border",
      defaultValue: "#ef4444",
    },
    {
      key: "--jinjer-summary-bg",
      inputId: "jinjer-summary-bg",
      defaultValue: "#ffd6d6",
    },
  ];

  const STATUS_DURATION_MS = 1800;
  let statusTimerId = null;

  const getInputMap = () => {
    const map = {};
    COLOR_FIELDS.forEach(({ key, inputId }) => {
      map[key] = document.getElementById(inputId);
    });
    return map;
  };

  const setStatus = (message) => {
    const statusEl = document.getElementById("status");
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    if (statusTimerId) {
      window.clearTimeout(statusTimerId);
    }

    statusTimerId = window.setTimeout(() => {
      statusEl.textContent = "";
      statusTimerId = null;
    }, STATUS_DURATION_MS);
  };

  const storageGet = (keys) =>
    new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (items) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(items);
      });
    });

  const storageSet = (items) =>
    new Promise((resolve, reject) => {
      chrome.storage.sync.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });

  const storageRemove = (keys) =>
    new Promise((resolve, reject) => {
      chrome.storage.sync.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });

  const collectInputValues = (inputMap) => {
    const values = {};
    COLOR_FIELDS.forEach(({ key }) => {
      const value = inputMap[key]?.value;
      if (typeof value === "string" && value) {
        values[key] = value;
      }
    });
    return values;
  };

  const applyValuesToInputs = (inputMap, values = {}) => {
    COLOR_FIELDS.forEach(({ key, defaultValue }) => {
      const input = inputMap[key];
      if (!input) {
        return;
      }

      input.value = values[key] || defaultValue;
    });
  };

  const loadSettings = async (inputMap) => {
    const keys = COLOR_FIELDS.map(({ key }) => key);
    const settings = await storageGet(keys);
    applyValuesToInputs(inputMap, settings);
  };

  const saveSettings = async (inputMap) => {
    const values = collectInputValues(inputMap);
    await storageSet(values);
    setStatus("保存しました。");
  };

  const resetToDefaults = async (inputMap) => {
    const keys = COLOR_FIELDS.map(({ key }) => key);
    await storageRemove(keys);
    applyValuesToInputs(inputMap);
    setStatus("デフォルト設定に戻しました。");
  };

  const initialize = async () => {
    const inputMap = getInputMap();

    document
      .getElementById("save-button")
      ?.addEventListener("click", async () => {
        try {
          await saveSettings(inputMap);
        } catch (error) {
          console.error("設定の保存に失敗しました", error);
          setStatus("保存に失敗しました。");
        }
      });

    document
      .getElementById("reset-button")
      ?.addEventListener("click", async () => {
        try {
          await resetToDefaults(inputMap);
        } catch (error) {
          console.error("設定のリセットに失敗しました", error);
          setStatus("リセットに失敗しました。");
        }
      });

    try {
      await loadSettings(inputMap);
    } catch (error) {
      console.error("設定の読み込みに失敗しました", error);
      applyValuesToInputs(inputMap);
      setStatus("設定読み込みに失敗したため既定値を表示しています。");
    }
  };

  document.addEventListener("DOMContentLoaded", initialize);
})();
