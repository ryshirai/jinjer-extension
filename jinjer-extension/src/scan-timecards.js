(() => {
  const extension = window.JINJER_EXTENSION;
  if (!extension?.constants || !extension?.utils || !extension?.logger) {
    console.error("Jinjer拡張の走査機能を初期化できません。依存モジュールが不足しています。");
    return;
  }

  const {
    STATUS_ANOMALY_PATTERN,
    STATUS_ALWAYS_HIGHLIGHT_PATTERN,
    SUMMARY_LABEL_TO_KEY,
    EPSILON,
  } = extension.constants;

  const {
    normalizeLabel,
    timeToMinutes,
    minutesToHm,
    parseNumericValue,
    parsePaidLeaveDays,
    parsePaidLeaveHoursFromHolidayText,
    hasPositiveNumericValue,
  } = extension.utils;

  const { logOnce, clear, logSummary, clearSummary } = extension.logger;

  const ROW_SELECTORS = {
    dateCell: "td.date",
    statusCell: "td.status",
    workingTimeCell: 'td.working[data-col="3"]',
    breakTimeCell: 'td.working[data-col="6"]',
    shiftTimeElement: "td.shift .time.sb",
    actualTimeCell: "td.timecard",
    holidayTdCell: "td.holiday_td",
    officeCell: 'td[data-col="1"]',
    wfhCell: 'td[data-col="2"]',
    holidayCell: "td.holiday",
  };

  const createRowAggregates = () => ({
    officeAttendanceCount: 0,
    wfhAttendanceCount: 0,
    paidLeaveDays: 0,
    attendanceDays: 0,
  });

  const clearRowHighlights = (rowElements) => {
    rowElements.row.classList.remove("jinjer-error-row");
    rowElements.statusCell?.classList.remove("jinjer-error-cell");
    rowElements.actualTimeCell?.classList.remove("jinjer-error-cell");
    rowElements.workingTimeCell?.classList.remove("jinjer-error-cell");
    rowElements.breakTimeCell?.classList.remove("jinjer-error-cell");
  };

  const extractRowElements = (row) => {
    const actualTimeCell = row.querySelector(ROW_SELECTORS.actualTimeCell);

    return {
      row,
      dateCell: row.querySelector(ROW_SELECTORS.dateCell),
      statusCell: row.querySelector(ROW_SELECTORS.statusCell),
      workingTimeCell: row.querySelector(ROW_SELECTORS.workingTimeCell),
      breakTimeCell: row.querySelector(ROW_SELECTORS.breakTimeCell),
      shiftTimeElement: row.querySelector(ROW_SELECTORS.shiftTimeElement),
      actualTimeCell,
      actualTimeElement: actualTimeCell?.querySelector(".time.tc"),
      holidayTdCell: row.querySelector(ROW_SELECTORS.holidayTdCell),
    };
  };

  const extractRowData = (rowElements, index) => {
    const dateText = rowElements.dateCell?.textContent?.trim() || `日付不明（${index + 1}行目）`;
    const statusText = rowElements.statusCell?.textContent || "";

    return {
      dateText,
      rowKey: `${dateText}-${index}`,
      statusText,
      hasLateCancellation: statusText.includes("(遅刻取消済)"),
      shiftStartText: rowElements.shiftTimeElement?.querySelector(".it1")?.textContent?.trim() || "",
      shiftEndText: rowElements.shiftTimeElement?.querySelector(".it2")?.textContent?.trim() || "",
      actualStartText: rowElements.actualTimeElement?.querySelector(".it1")?.textContent?.trim() || "",
      actualEndText: rowElements.actualTimeElement?.querySelector(".it2")?.textContent?.trim() || "",
      holidayTdText: rowElements.holidayTdCell?.textContent || "",
      workingTimeText: rowElements.workingTimeCell?.textContent || "",
      breakTimeText: rowElements.breakTimeCell?.textContent || "",
    };
  };

  const evaluateStatusIssues = ({ statusText, hasLateCancellation, statusCell, reasons }) => {
    const normalizedStatus = statusText.trim();
    const hasStatusAnomaly = STATUS_ANOMALY_PATTERN.test(normalizedStatus);
    const shouldAlwaysHighlight = STATUS_ALWAYS_HIGHLIGHT_PATTERN.test(normalizedStatus);
    const hasLateStatus = /遅刻/.test(normalizedStatus);
    const shouldHighlightStatus = shouldAlwaysHighlight || (hasLateStatus && !hasLateCancellation);

    if (!hasStatusAnomaly || !shouldHighlightStatus) {
      return;
    }

    reasons.push(`ステータス異常: ${normalizedStatus || "空欄"}`);
    statusCell?.classList.add("jinjer-error-cell");
  };

  const evaluateScheduleMismatch = ({
    rowData,
    actualTimeCell,
    reasons,
  }) => {
    const scheduleLogKey = `${rowData.rowKey}-schedule-mismatch`;
    const leaveCoverageLogKey = `${rowData.rowKey}-leave-coverage`;

    const shiftStartMinutes = timeToMinutes(rowData.shiftStartText);
    const shiftEndMinutes = timeToMinutes(rowData.shiftEndText);
    const actualStartMinutes = timeToMinutes(rowData.actualStartText);
    const actualEndMinutes = timeToMinutes(rowData.actualEndText);

    const isLateArrival =
      shiftStartMinutes !== null &&
      actualStartMinutes !== null &&
      actualStartMinutes > shiftStartMinutes;

    const isEarlyDeparture =
      shiftEndMinutes !== null &&
      actualEndMinutes !== null &&
      actualEndMinutes < shiftEndMinutes;

    const hasScheduleMismatch =
      !rowData.hasLateCancellation && (isLateArrival || isEarlyDeparture);

    const paidLeaveHours = parsePaidLeaveHoursFromHolidayText(rowData.holidayTdText);
    const paidLeaveMinutes = Math.round(paidLeaveHours * 60);

    const lateMinutes =
      shiftStartMinutes !== null && actualStartMinutes !== null
        ? Math.max(0, actualStartMinutes - shiftStartMinutes)
        : 0;

    const earlyMinutes =
      shiftEndMinutes !== null && actualEndMinutes !== null
        ? Math.max(0, shiftEndMinutes - actualEndMinutes)
        : 0;

    const totalTimeLostMinutes = lateMinutes + earlyMinutes;
    const isCoveredByPaidLeave =
      hasScheduleMismatch &&
      paidLeaveMinutes > 0 &&
      totalTimeLostMinutes > 0 &&
      totalTimeLostMinutes <= paidLeaveMinutes;

    if (hasScheduleMismatch && !isCoveredByPaidLeave) {
      const shiftRange = `${rowData.shiftStartText || "-"}-${rowData.shiftEndText || "-"}`;
      const actualRange = `${rowData.actualStartText || "-"}-${rowData.actualEndText || "-"}`;

      reasons.push(`シフト不一致: シフト[${shiftRange}] 実績[${actualRange}]`);
      actualTimeCell?.classList.add("jinjer-error-cell");

      logOnce(
        scheduleLogKey,
        `シフト不一致（${rowData.dateText}）: シフト[${shiftRange}] 実績[${actualRange}]`,
      );
      clear(leaveCoverageLogKey);
      return;
    }

    if (isCoveredByPaidLeave) {
      clear(scheduleLogKey);
      logOnce(
        leaveCoverageLogKey,
        `有休で補填済み（${rowData.dateText}）: 不足=${minutesToHm(totalTimeLostMinutes)} 有休=${minutesToHm(paidLeaveMinutes)}（有休${paidLeaveHours}h）`,
      );
      return;
    }

    clear(scheduleLogKey);
    clear(leaveCoverageLogKey);
  };

  const evaluateBreakIssues = ({
    rowData,
    workingTimeCell,
    breakTimeCell,
    reasons,
  }) => {
    const breakLogKey = `${rowData.rowKey}-break`;

    const workingMinutes = timeToMinutes(rowData.workingTimeText);
    const breakMinutes = timeToMinutes(rowData.breakTimeText);
    const breakReasons = [];

    if (breakMinutes !== null && breakMinutes > 60) {
      breakReasons.push("休憩超過");
      breakTimeCell?.classList.add("jinjer-error-cell");
    }

    if (workingMinutes !== null && workingMinutes >= 360 && breakMinutes === 0) {
      breakReasons.push("法定休憩不足");
      workingTimeCell?.classList.add("jinjer-error-cell");
      breakTimeCell?.classList.add("jinjer-error-cell");
    }

    if (breakReasons.length === 0) {
      clear(breakLogKey);
      return;
    }

    reasons.push(`休憩異常: ${breakReasons.join(" / ")}`);
    logOnce(
      breakLogKey,
      `休憩異常（${rowData.dateText}）: 労働[data-col=3]=${minutesToHm(workingMinutes)} 休憩[data-col=6]=${minutesToHm(breakMinutes)} 判定=${breakReasons.join(" / ")}`,
    );
  };

  const applyRowResult = ({ row, rowKey, dateText, reasons }) => {
    if (reasons.length > 0) {
      row.classList.add("jinjer-error-row");
      logOnce(rowKey, `行異常（${dateText}）: ${reasons.join("、")}`);
      return;
    }

    clear(rowKey);
  };

  const updateAttendanceAggregates = (row, rowAggregates) => {
    const officeCell = row.querySelector(ROW_SELECTORS.officeCell);
    const wfhCell = row.querySelector(ROW_SELECTORS.wfhCell);
    const holidayCell = row.querySelector(ROW_SELECTORS.holidayCell);

    const hasOfficeAttendance = hasPositiveNumericValue(officeCell?.textContent || "");
    const hasWfhAttendance = hasPositiveNumericValue(wfhCell?.textContent || "");
    const holidayText = holidayCell?.textContent || row.textContent || "";
    const hasPaidLeave = holidayText.includes("有休");

    if (hasOfficeAttendance) {
      rowAggregates.officeAttendanceCount += 1;
    }

    if (hasWfhAttendance) {
      rowAggregates.wfhAttendanceCount += 1;
    }

    if (hasPaidLeave) {
      rowAggregates.paidLeaveDays += 1;
    }

    if (hasOfficeAttendance || hasWfhAttendance || hasPaidLeave) {
      rowAggregates.attendanceDays += 1;
    }
  };

  const collectSummaryValues = () => {
    const summaryBlock = document.querySelector(".employee_data_info .employee_schedule_block");
    const summaryItems = summaryBlock?.querySelectorAll("li") || [];
    const summaryValues = new Map();

    summaryItems.forEach((item) => {
      item.classList.remove("jinjer-summary-error");

      const headElement = item.querySelector("span.head");
      const label = normalizeLabel(headElement?.textContent?.trim() || "");
      const valueKey = SUMMARY_LABEL_TO_KEY[label];
      if (!valueKey) {
        return;
      }

      const nextSpan = headElement?.nextElementSibling;
      const valueText =
        nextSpan?.textContent?.trim() ||
        item.textContent?.replace(headElement?.textContent || "", "").trim() ||
        "";

      const parsedValue =
        valueKey === "paidLeaveDays" ? parsePaidLeaveDays(valueText) : parseNumericValue(valueText);

      summaryValues.set(valueKey, {
        li: item,
        value: parsedValue,
      });
    });

    return summaryValues;
  };

  const evaluateSummaryValues = (summaryValues, rowAggregates) => {
    const absentDays = summaryValues.get("absentDays")?.value;
    if (absentDays !== null && absentDays > 0) {
      summaryValues.get("absentDays")?.li.classList.add("jinjer-summary-error");
      logSummary("absentDays", "サマリー異常: 欠勤日数が0より大きいです。");
    } else {
      clearSummary("absentDays");
    }

    const lateEarlyCount = summaryValues.get("lateEarlyCount")?.value;
    if (lateEarlyCount !== null && lateEarlyCount > 0) {
      summaryValues.get("lateEarlyCount")?.li.classList.add("jinjer-summary-error");
      logSummary("lateEarlyCount", "サマリー異常: 遅刻早退回数が0より大きいです。");
    } else {
      clearSummary("lateEarlyCount");
    }

    const numericSummaryValues = {
      attendanceDays: summaryValues.get("attendanceDays")?.value,
      officeAttendanceCount: summaryValues.get("officeAttendanceCount")?.value,
      wfhAttendanceCount: summaryValues.get("wfhAttendanceCount")?.value,
      paidLeaveDays: summaryValues.get("paidLeaveDays")?.value,
    };

    const mismatchedSummaryKeys = Object.entries(numericSummaryValues)
      .filter(([, summaryValue]) => summaryValue !== null)
      .filter(([key, summaryValue]) => Math.abs(summaryValue - rowAggregates[key]) > EPSILON)
      .map(([key]) => key);

    if (mismatchedSummaryKeys.length === 0) {
      clearSummary("attendanceMismatch");
      return;
    }

    if (mismatchedSummaryKeys.includes("attendanceDays")) {
      summaryValues.get("attendanceDays")?.li.classList.add("jinjer-summary-error");
    }

    if (mismatchedSummaryKeys.includes("officeAttendanceCount")) {
      summaryValues.get("officeAttendanceCount")?.li.classList.add("jinjer-summary-error");
    }

    if (mismatchedSummaryKeys.includes("wfhAttendanceCount")) {
      summaryValues.get("wfhAttendanceCount")?.li.classList.add("jinjer-summary-error");
    }

    // 有休取得日数の差分は表示を増やしすぎないため、コンソールログのみで通知する。
    const mismatchText = mismatchedSummaryKeys
      .map((key) => `${key}: サマリー=${numericSummaryValues[key]} 行集計=${rowAggregates[key]}`)
      .join(", ");

    logSummary("attendanceMismatch", `サマリー異常: 行集計と不一致です（${mismatchText}）`);
  };

  // メインフロー:
  // 1) 行ごとの表示をリセット
  // 2) 各判定を実行
  // 3) 行の結果を反映
  // 4) 最後にサマリー整合性を検証
  const scanRows = () => {
    const rows = document.querySelectorAll("tr.page-break");
    const rowAggregates = createRowAggregates();

    rows.forEach((row, index) => {
      const rowElements = extractRowElements(row);
      const rowData = extractRowData(rowElements, index);
      const reasons = [];

      clearRowHighlights(rowElements);

      evaluateStatusIssues({
        statusText: rowData.statusText,
        hasLateCancellation: rowData.hasLateCancellation,
        statusCell: rowElements.statusCell,
        reasons,
      });

      evaluateScheduleMismatch({
        rowData,
        actualTimeCell: rowElements.actualTimeCell,
        reasons,
      });

      evaluateBreakIssues({
        rowData,
        workingTimeCell: rowElements.workingTimeCell,
        breakTimeCell: rowElements.breakTimeCell,
        reasons,
      });

      applyRowResult({
        row,
        rowKey: rowData.rowKey,
        dateText: rowData.dateText,
        reasons,
      });

      updateAttendanceAggregates(row, rowAggregates);
    });

    const summaryValues = collectSummaryValues();
    evaluateSummaryValues(summaryValues, rowAggregates);
  };

  window.JINJER_EXTENSION = {
    ...window.JINJER_EXTENSION,
    scanner: {
      scanRows,
    },
  };
})();
