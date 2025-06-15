class CalendarWidget {
    constructor(containerId, onDateSelect) {
        this.container = document.getElementById(containerId);
        this.onDateSelect = onDateSelect;
        this.currentDate = new Date();
        this.bookings = [];
    }

    init() {
        this.render();
        this.loadBookings();
    }

    async loadBookings() {
        try {
            const response = await fetch('http://localhost:3000/bookings');
            this.bookings = await response.json();
            this.render();
        } catch (error) {
            console.error('Ошибка загрузки записей:', error);
        }
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay() || 7;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = this.getDaysInMonth(year, month);
        const firstDay = this.getFirstDayOfMonth(year, month);

        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];

        let html = `
            <div class="calendar-widget">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" onclick="calendarWidget.previousMonth()">&lt;</button>
                    <h3>${monthNames[month]} ${year}</h3>
                    <button class="calendar-nav-btn" onclick="calendarWidget.nextMonth()">&gt;</button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-day-header">Пн</div>
                    <div class="calendar-day-header">Вт</div>
                    <div class="calendar-day-header">Ср</div>
                    <div class="calendar-day-header">Чт</div>
                    <div class="calendar-day-header">Пт</div>
                    <div class="calendar-day-header">Сб</div>
                    <div class="calendar-day-header">Вс</div>
        `;

        // Добавляем пустые ячейки для дней до начала месяца
        for (let i = 1; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Добавляем дни месяца
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = this.formatDate(date);
            const dayBookings = this.bookings.filter(b => b.date === dateStr);
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;

            let className = 'calendar-day';
            if (isToday) className += ' today';
            if (isPast) className += ' past';
            if (dayBookings.length > 0) className += ' booked';

            html += `
                <div class="${className}" data-date="${dateStr}">
                    <div class="date">${day}</div>
                    ${dayBookings.length > 0 ? `<div class="bookings-count">${dayBookings.length}</div>` : ''}
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // Добавляем обработчики кликов
        this.container.querySelectorAll('.calendar-day:not(.empty):not(.past)').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                this.onDateSelect(date);
            });
        });
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }
} 