(() => {
  // ラベル比較でズレが出ないように、全角/半角コロンと空白を除去する。
  const normalizeLabel = (label) => label.replace(/[：:\s]/g, "");

  const timeToMinutes = (timeStr) => {
    if (!timeStr) {
      return null;
    }

    const normalized = timeStr.trim();
    if (!normalized || normalized === "-" || normalized === "欠勤") {
      return null;
    }

    const matched = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (!matched) {
      return null;
    }

    const hours = Number.parseInt(matched[1], 10);
    const minutes = Number.parseInt(matched[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes >= 60) {
      return null;
    }

    return hours * 60 + minutes;
  };

  const minutesToHm = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "-";
    }

    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  };

  const parseNumericValue = (text) => {
    const matched = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return matched ? Number.parseFloat(matched[0]) : null;
  };

  const parsePaidLeaveDays = (text) => {
    const value = parseNumericValue(text);
    if (value === null) {
      return null;
    }

    // Jinjerでは「日」表記と「h」表記が混在するため、hは1日8時間換算にそろえる。
    return /h/i.test(text) ? value / 8 : value;
  };

  const parsePaidLeaveHoursFromHolidayText = (text) => {
    if (!text) {
      return 0;
    }

    const matched = text.match(/有休[（(]\s*(\d+(?:\.\d+)?)\s*h\s*[)）]/i);
    if (!matched) {
      return 0;
    }

    const hours = Number.parseFloat(matched[1]);
    return Number.isNaN(hours) ? 0 : hours;
  };

  const hasPositiveNumericValue = (text) => {
    const value = parseNumericValue(text || "");
    return value !== null && value > 0;
  };

  window.JINJER_EXTENSION = {
    ...(window.JINJER_EXTENSION || {}),
    utils: {
      normalizeLabel,
      timeToMinutes,
      minutesToHm,
      parseNumericValue,
      parsePaidLeaveDays,
      parsePaidLeaveHoursFromHolidayText,
      hasPositiveNumericValue,
    },
  };
})();
