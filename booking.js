const API_URL = 'http://localhost:3000';

// Устанавливаем начальную дату на понедельник текущей недели
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
currentWeekStart.setHours(0, 0, 0, 0);

async function fetchBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке записей');
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при загрузке записей:', error);
        return [];
    }
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

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
    console.log('Creating calendar with bookings:', bookings);
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
            const dayBookings = bookings.filter(b => b.date === dateStr && b.time === time);
            const bookingCount = dayBookings.length;
            
            if (date < today) {
                cell.classList.add('past');
                cell.textContent = 'Недоступно';
            } else {
                cell.classList.add('available');
                if (bookingCount > 0) {
                    cell.classList.add('booked');
                    cell.textContent = `Занято (${bookingCount})`;
                } else {
                    cell.textContent = 'Свободно';
                }
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

// Функции для работы с отзывами
async function loadReviews() {
    try {
        const response = await fetch(`${API_URL}/reviews`);
        const reviews = await response.json();
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '';

        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p style="text-align: center;">Пока нет отзывов. Будьте первым!</p>';
            return;
        }

        reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(review => {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            
            const date = new Date(review.timestamp).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            reviewCard.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-name">${review.name}</div>
                        <div class="review-date">${date}</div>
                    </div>
                    <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <div class="review-content">
                    <p>${review.text}</p>
                </div>
                ${review.reply ? `
                    <div class="review-reply">
                        <div class="reply-header">Ответ мастера:</div>
                        <div class="reply-content">${review.reply}</div>
                        <div class="reply-date">${new Date(review.replyTimestamp).toLocaleDateString('ru-RU')}</div>
                    </div>
                ` : ''}
            `;
            reviewsList.appendChild(reviewCard);
        });
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<p style="color: red; text-align: center;">Не удалось загрузить отзывы.</p>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('bookingForm');
    const success = document.getElementById('bookingSuccess');
    const error = document.getElementById('bookingError');
    const reviewForm = document.getElementById('reviewForm');
    const reviewMessage = document.getElementById('reviewMessage');

    form.style.display = 'none'; // Скрываем форму при загрузке страницы

    // Обновляем календарь при загрузке страницы
    refreshCalendar();
    // Загружаем отзывы при загрузке страницы
    loadReviews();

    // Устанавливаем минимальную дату как сегодня
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="date"]').min = today;

    // Обновляем данные каждые 30 секунд
    setInterval(refreshCalendar, 30000);
    setInterval(loadReviews, 60000); // Обновляем отзывы каждую минуту

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
        
        console.log('Отправка формы:', { name, phone, telegramUsername, service, date, time });
        
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
            console.error('Ошибка при отправке формы:', err);
            error.textContent = err.message;
            error.style.display = 'block';
        });
    });

    // Обработчик отправки формы отзыва
    reviewForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        reviewMessage.style.display = 'none';
        reviewMessage.className = '';

        const formData = new FormData(reviewForm);
        const name = formData.get('reviewerName');
        const text = formData.get('reviewText');
        const rating = parseInt(formData.get('rating'));

        try {
            const response = await fetch(`${API_URL}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, text, rating })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Ошибка при отправке отзыва');
            }

            reviewMessage.textContent = 'Ваш отзыв успешно отправлен!';
            reviewMessage.classList.add('success');
            reviewMessage.style.display = 'block';
            reviewForm.reset(); // Очищаем форму
            loadReviews(); // Обновляем список отзывов
        } catch (err) {
            reviewMessage.textContent = err.message;
            reviewMessage.classList.add('error');
            reviewMessage.style.display = 'block';
        }
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