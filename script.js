const graph = document.getElementById("contributionGraph");
const monthLabels = document.getElementById("monthLabels");

const selectedDateText = document.getElementById("selectedDate");
const selectedTimeText = document.getElementById("selectedTime");

const studyTimeInput = document.getElementById("studyTime");
const saveButton = document.getElementById("saveButton");

const totalHoursElement = document.getElementById("totalHours");
const clearButton = document.getElementById("clearButton");

let studyData = {};
let selectedDate = null;

/*
========================================
백엔드 서버에서 노션 데이터 가져오기 (동일 날짜 시간 합산 반영)
========================================
*/
async function loadStudyDataFromBackend() {
    try {
        const response = await fetch('http://localhost:3000/api/contributions');
        const result = await response.json();

        if (result.success) {
            studyData = {};
            result.data.forEach(item => {
                const date = item.properties?.["날짜"]?.date?.start;
                const hours = item.properties?.["시간"]?.number || 0;
                if (date) {
                    // 동일한 날짜에 여러 기록이 있을 경우 시간이 합산되도록 누적(+) 처리
                    if (studyData[date]) {
                        studyData[date] += hours;
                    } else {
                        studyData[date] = hours;
                    }
                }
            });
            createGraph();
        } else {
            console.error("서버 데이터 로드 실패:", result.error);
            createGraph();
        }
    } catch (error) {
        console.error("서버 연결 에러:", error);
        createGraph();
    }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLevel(hours) {
  if (hours <= 0) return 0;
  if (hours <= 1) return 1;
  if (hours <= 2) return 2;
  if (hours <= 3) return 3;
  if (hours <= 4) return 4;
  if (hours <= 5) return 5;
  if (hours <= 6) return 6;
  if (hours <= 8) return 7;
  if (hours <= 10) return 8;
  return 9; 
}

function createGraph() {
  graph.innerHTML = "";
  monthLabels.innerHTML = "";

  const today = new Date();
  
  const startDate = new Date(
    today.getFullYear() - 1,
    today.getMonth(),
    today.getDate()
  );

  let dayOfWeek = startDate.getDay();
  let diffToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - diffToMonday);

  const endDate = new Date(today);
  let endDayOfWeek = endDate.getDay();
  let diffToSunday = (endDayOfWeek === 0) ? 0 : 7 - endDayOfWeek;
  endDate.setDate(endDate.getDate() + diffToSunday);

  let currentDate = new Date(startDate);
  let allWeeks = [];
  let currentWeek = new Array(7).fill(null);

  while (currentDate <= endDate) {
    let dayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1; // 월:0 ~ 일:6
    currentWeek[dayIndex] = new Date(currentDate);

    if (dayIndex === 6 || currentDate.getTime() === endDate.getTime()) {
      allWeeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  allWeeks.forEach((weekDays) => {
    const weekEl = document.createElement("div");
    weekEl.className = "week";

    let boundaryIndex = -1;
    for (let i = 1; i < 7; i++) {
      if (weekDays[i] && weekDays[i - 1]) {
        if (weekDays[i].getMonth() !== weekDays[i - 1].getMonth()) {
          boundaryIndex = i;
          break;
        }
      }
    }

    let isFirstDayMonday = false;
    if (weekDays[0] && weekDays[0].getDate() === 1) {
      isFirstDayMonday = true;
    }

    weekDays.forEach((d, rowIndex) => {
      const dayEl = document.createElement("div");
      if (!d) {
        dayEl.className = "day empty";
        weekEl.appendChild(dayEl);
        return;
      }

      const dateString = formatDate(d);
      const hours = studyData[dateString] || 0;
      const level = getLevel(hours);

      dayEl.className = `day level-${level}`;
      dayEl.dataset.date = dateString;
      dayEl.title = `${dateString} · ${hours}시간`;

      if (boundaryIndex !== -1) {
        if (rowIndex < boundaryIndex) {
          dayEl.classList.add("month-end-right");
        } else {
          dayEl.classList.add("month-start-left");
        }
      } else if (isFirstDayMonday) {
        dayEl.classList.add("month-start-left");
      }

      dayEl.addEventListener("click", () => selectDate(dateString));
      weekEl.appendChild(dayEl);
    });

    graph.appendChild(weekEl);
  });

  renderMonthLabels(allWeeks, startDate);
  updateTotalHours();
}

function renderMonthLabels(allWeeks, startDate) {
  let previousMonth = -1;
  allWeeks.forEach((weekDays, weekIndex) => {
    const firstValidDay = weekDays.find(d => d !== null);
    if (firstValidDay) {
      const month = firstValidDay.getMonth();
      if (month !== previousMonth && firstValidDay.getDate() <= 7) {
        const monthLabel = document.createElement("span");
        monthLabel.className = "month-label";
        monthLabel.textContent = firstValidDay.toLocaleDateString("en-US", { month: "short" });

        monthLabel.style.left = `${weekIndex * 15}px`;
        monthLabels.appendChild(monthLabel);
        previousMonth = month;
      }
    }
  });
}

function selectDate(dateString) {
  selectedDate = dateString;
  const hours = studyData[dateString] || 0;
  selectedDateText.textContent = dateString;
  selectedTimeText.textContent = `현재 공부시간: ${hours}시간`;
  studyTimeInput.value = hours > 0 ? hours : "";
}

function saveStudyTime() {
  if (!selectedDate) {
    alert("먼저 날짜를 선택해주세요.");
    return;
  }
  const value = parseFloat(studyTimeInput.value);
  if (Number.isNaN(value) || value < 0) {
    alert("올바른 공부시간을 입력해주세요.");
    return;
  }

  if (value === 0) {
    delete studyData[selectedDate];
  } else {
    studyData[selectedDate] = value;
  }

  localStorage.setItem("studyContribution", JSON.stringify(studyData));
  createGraph();
  selectDate(selectedDate);
}

function updateTotalHours() {
  const total = Object.values(studyData).reduce((sum, value) => sum + Number(value), 0);
  totalHoursElement.textContent = total.toFixed(1);
}

function clearAllData() {
  const confirmed = confirm("모든 공부 기록을 삭제할까요?");
  if (!confirmed) return;

  studyData = {};
  localStorage.removeItem("studyContribution");
  selectedDate = null;
  selectedDateText.textContent = "날짜를 선택하세요";
  selectedTimeText.textContent = "공부시간을 입력할 수 있습니다.";
  studyTimeInput.value = "";
  createGraph();
}

saveButton.addEventListener("click", saveStudyTime);
clearButton.addEventListener("click", clearAllData);
studyTimeInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    saveStudyTime();
  }
});

loadStudyDataFromBackend();