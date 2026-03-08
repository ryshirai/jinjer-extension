(() => {
  const targetPath = "/staffs/time_cards";

  window.JINJER_EXTENSION = {
    ...(window.JINJER_EXTENSION || {}),
    constants: {
      TARGET_ORIGIN: "https://kintai.jinjer.biz",
      TARGET_PATH: targetPath,
      SELECTORS: {
        timecardRows: "tr.page-break",
        summaryBlock: ".employee_data_info .employee_schedule_block",
        summaryItems: "li",
        summaryHead: "span.head",
        row: {
          dateCell: "td.date",
          statusCell: "td.status",
          workingTimeCell: 'td.working[data-col="3"]',
          breakTimeCell: 'td.working[data-col="6"]',
          shiftTimeElement: "td.shift .time.sb",
          actualTimeCell: "td.timecard",
          actualTimeElement: ".time.tc",
          timeStart: ".it1",
          timeEnd: ".it2",
          holidayTdCell: "td.holiday_td",
          officeCell: 'td[data-col="1"]',
          wfhCell: 'td[data-col="2"]',
          holidayCell: "td.holiday",
        },
        modal: {
          wrapper: ".modifyShiftPopupShowWrapper",
          closeButton: ".close-modal",
          titleBar: ".popUpTitle",
        },
      },
      STATUS_ANOMALY_PATTERN: /(エラー|遅刻|欠勤)/,
      STATUS_ALWAYS_HIGHLIGHT_PATTERN: /(未打刻|エラー|欠勤)/,
      SUMMARY_LABEL_TO_KEY: {
        出勤日数: "attendanceDays",
        欠勤日数: "absentDays",
        遅刻早退回数: "lateEarlyCount",
        出社回数: "officeAttendanceCount",
        在宅回数: "wfhAttendanceCount",
        有休取得日数: "paidLeaveDays",
      },
      BASE_MODAL_Z_INDEX: "10000",
      DRAG_MODAL_Z_INDEX: "2147483647",
      SELECTOR_WAIT_TIMEOUT_MS: 10000,
      EPSILON: 1e-9,
    },
  };
})();
