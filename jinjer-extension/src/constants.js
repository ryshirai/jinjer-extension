(() => {
  const targetPath = "/staffs/time_cards";

  window.JINJER_EXTENSION = {
    ...(window.JINJER_EXTENSION || {}),
    constants: {
      TARGET_ORIGIN: "https://kintai.jinjer.biz",
      TARGET_PATH: targetPath,
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
      EPSILON: 1e-9,
    },
  };
})();
