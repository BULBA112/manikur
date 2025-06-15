// Admin password - in a real application, this should be handled securely on the server
const ADMIN_PASSWORD = 'admin123';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const addBookingBtn = document.getElementById('addBookingBtn');
const addBookingForm = document.getElementById('addBookingForm');
const cancelAddBooking = document.getElementById('cancelAddBooking');
const newBookingForm = document.getElementById('newBookingForm');
const bookingsList = document.getElementById('bookingsList');
const totalBookings = document.getElementById('totalBookings');
const todayBookings = document.getElementById('todayBookings');

const API_URL = 'http://localhost:3000'; // Установлен правильный URL сервера

// Check if user is already logged in
if (localStorage.getItem('adminLoggedIn')) {
    showAdminPanel();
}

// Login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        alert('Неверный пароль');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    hideAdminPanel();
});

// Show/hide admin panel
function showAdminPanel() {
    console.log('Showing admin panel and loading bookings...');
    loginForm.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadBookings();
}

function hideAdminPanel() {
    loginForm.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

// Add booking modal
addBookingBtn.addEventListener('click', () => {
    addBookingForm.classList.remove('hidden');
});

cancelAddBooking.addEventListener('click', () => {
    addBookingForm.classList.add('hidden');
    newBookingForm.reset();
});

// Calendar functionality
function generateCalendar(bookings) {
    console.log('Generating calendar with bookings:', bookings);
    const calendar = document.getElementById('calendar');
    if (!calendar) {
        console.error('Calendar element not found!');
        return;
    }
    calendar.innerHTML = '';

    // Add day headers
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // Get current date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDay = firstDay.getDay() || 7; // Convert Sunday (0) to 7

    // Add empty cells for days before the first day of the month
    for (let i = 1; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendar.appendChild(emptyDay);
    }

    // Add days of the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateString = date.toISOString().split('T')[0];
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Add today class if it's current day
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Count bookings for this day
        const dayBookings = bookings.filter(b => b.date === dateString);
        if (dayBookings.length > 0) {
            dayElement.classList.add('booked');
        }

        dayElement.innerHTML = `
            <div class="date">${day}</div>
            <div class="bookings-count">${dayBookings.length} записей</div>
        `;

        // Add click handler to show bookings for this day
        dayElement.addEventListener('click', () => {
            showDayBookings(dateString, dayBookings);
        });

        calendar.appendChild(dayElement);
    }
}

function showDayBookings(date, bookings) {
    const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let message = `Записи на ${formattedDate}:\n\n`;
    if (bookings.length === 0) {
        message += 'Нет записей';
    } else {
        bookings.forEach(booking => {
            message += `${booking.time} - ${booking.name} (${booking.phone})\n`;
        });
    }

    alert(message);
}

// Update loadBookings function
async function loadBookings() {
    console.log('Loading bookings...');
    try {
        const response = await fetch(API_URL + '/bookings');
        const bookings = await response.json();
        console.log('Bookings loaded:', bookings);
        
        // Update statistics
        totalBookings.textContent = bookings.length;
        const today = new Date().toISOString().split('T')[0];
        const todayCount = bookings.filter(b => b.date === today).length;
        todayBookings.textContent = todayCount;

        // Generate calendar
        generateCalendar(bookings);

        // Update bookings table
        bookingsList.innerHTML = '';
        bookings.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(booking.date)}</td>
                <td>${booking.time}</td>
                <td>${booking.name}</td>
                <td>${booking.phone}</td>
                <td>${booking.telegramUsername || '-'}</td>
                <td>${booking.service || '-'}</td>
                <td>
                    <button class="delete-btn" data-id="${booking.date}-${booking.time}">Удалить</button>
                </td>
            `;
            bookingsList.appendChild(row);
        });

        // Add delete event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    } catch (error) {
        console.error('Error loading bookings:', error);
        alert('Ошибка при загрузке записей');
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Handle delete booking
async function handleDelete(e) {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
    }

    const [date, time] = e.target.dataset.id.split('-');
    try {
        const response = await fetch(API_URL + '/bookings', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date, time })
        });

        if (response.ok) {
            loadBookings();
        } else {
            throw new Error('Failed to delete booking');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Ошибка при удалении записи');
    }
}

// Handle new booking form submission
newBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const booking = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        telegramUsername: document.getElementById('telegramUsername').value,
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value
    };

    try {
        const response = await fetch(API_URL + '/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(booking)
        });

        if (response.ok) {
            addBookingForm.classList.add('hidden');
            newBookingForm.reset();
            loadBookings();
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to add booking');
        }
    } catch (error) {
        console.error('Error adding booking:', error);
        alert(error.message || 'Ошибка при добавлении записи');
    }
}); 