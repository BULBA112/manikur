const API_URL = 'https://manicure-i2ex.onrender.com';

function fetchBookings() {
    return fetch(`${API_URL}/bookings`).then(r => r.json());
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

let currentWeekStart = new Date();
currentWeekStart.setHours(0, 0, 0, 0);
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + (currentWeekStart.getDay() === 0 ? -6 : 1)); // Устанавливаем на понедельник текущей недели

function getWeekRange(startDate) {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        dates.push(current);
    }
    return dates;
}

function createCalendar(bookings) {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDates = getWeekRange(currentWeekStart);
    
    // Создаем заголовок календаря
    const header = document.createElement('div');
    header.className = 'calendar-header';
    
    // Добавляем пустой элемент для выравнивания с колонкой времени
    const emptyHeaderCell = document.createElement('div');
    emptyHeaderCell.className = 'calendar-time-placeholder';
    header.appendChild(emptyHeaderCell);
    
    weekDates.forEach(date => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
        const dayNumber = date.getDate();
        dayHeader.innerHTML = `${dayName}<br>${dayNumber}`;
        header.appendChild(dayHeader);
    });
    calendar.appendChild(header);
    
    // Создаем временные слоты
    const timeSlots = [
        '10:00', '11:00', '12:00', '13:00', '14:00', 
        '15:00', '16:00', '17:00', '18:00', '19:00'
    ];
    
    timeSlots.forEach(time => {
        const row = document.createElement('div');
        row.className = 'calendar-row';
        
        // Добавляем время
        const timeCell = document.createElement('div');
        timeCell.className = 'calendar-time';
        timeCell.textContent = time;
        row.appendChild(timeCell);
        
        // Добавляем ячейки для каждого дня
        weekDates.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            const dateStr = formatDate(date);
            const isBooked = bookings.some(b => b.date === dateStr && b.time === time);
            
            if (isBooked) {
                cell.classList.add('booked');
                cell.textContent = 'Занято';
            } else if (date < today) {
                cell.classList.add('past');
                cell.textContent = 'Недоступно';
            } else {
                cell.classList.add('available');
                cell.textContent = 'Свободно';
                cell.onclick = () => selectTimeSlot(dateStr, time);
            }
            
            row.appendChild(cell);
        });
        
        calendar.appendChild(row);
    });
}

function showPreviousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    refreshCalendar();
}

function showNextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    refreshCalendar();
}

function refreshCalendar() {
    fetchBookings().then(data => {
        const bookings = data;
        createCalendar(bookings);
        updateMonthYearDisplay();
    });
}

function updateMonthYearDisplay() {
    const monthYearElement = document.getElementById('currentMonthYear');
    const options = { year: 'numeric', month: 'long' };
    monthYearElement.textContent = currentWeekStart.toLocaleDateString('ru-RU', options);
}

function selectTimeSlot(date, time) {
    const form = document.getElementById('bookingForm');
    form.style.display = 'block';
    form.querySelector('input[name="date"]').value = date;
    
    const timeSelect = form.querySelector('select[name="time"]');
    timeSelect.innerHTML = ''; 
    
    const timeSlots = [
        '10:00', '11:00', '12:00', '13:00', '14:00', 
        '15:00', '16:00', '17:00', '18:00', '19:00'
    ];
    
    timeSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        if (slot === time) {
            option.selected = true;
        }
        timeSelect.appendChild(option);
    });
    
    form.scrollIntoView({ behavior: 'smooth' });
}

function updateBookingsTable(bookings) {
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = '';
    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${b.name}</td><td>${b.date}</td><td>${b.time}</td>`;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('bookingForm');
    const success = document.getElementById('bookingSuccess');
    const error = document.getElementById('bookingError');

    // Обновляем календарь при загрузке страницы
    refreshCalendar();

    // Устанавливаем минимальную дату как сегодня (это нужно для input date, но в нашем случае календарь управляет датами)
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="date"]').min = today;

    // Обновляем данные каждые 30 секунд
    setInterval(refreshCalendar, 30000);

    // Привязываем кнопки навигации к функциям
    document.getElementById('prevWeekBtn').addEventListener('click', showPreviousWeek);
    document.getElementById('nextWeekBtn').addEventListener('click', showNextWeek);

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        error.style.display = 'none';
        const formData = new FormData(form);
        const name = formData.get('name');
        const phone = formData.get('phone');
        const telegramUsername = formData.get('telegramUsername');
        const service = formData.get('service');
        const date = formData.get('date');
        const time = formData.get('time');
        
        // Получаем текущие бронирования для проверки
        fetchBookings().then(currentBookings => {
            const isBooked = currentBookings.some(b => b.date === date && b.time === time);
            if (isBooked) {
                error.textContent = 'Это время уже занято!';
                error.style.display = 'block';
                return;
            }
            
            fetch(`${API_URL}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, telegramUsername, service, date, time })
            })
            .then(r => {
                if (r.status === 409) throw new Error('Это время уже занято!');
                return r.json();
            })
            .then(() => {
                form.style.display = 'none';
                success.style.display = 'block';
                refreshCalendar(); // Обновляем календарь после успешной записи
            })
            .catch(err => {
                error.textContent = err.message;
                error.style.display = 'block';
            });
        });
    });

    // Инициализация карты Leaflet
    const map = L.map('map').setView([58.020757, 56.288463], 16); // Устанавливаем центр и зум

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([58.020757, 56.288463]).addTo(map)
        .bindPopup('Наш офис: Пермь, Лебедева 25')
        .openPopup();
}); 