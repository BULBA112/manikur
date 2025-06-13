const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Замените на свой токен и chat_id
const TELEGRAM_BOT_TOKEN = '8039799949:AAFxAF1ScVCzV-OKH3IwvN_OukHGLR1iSk0';
const TELEGRAM_CHAT_ID = '5103411502';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Хранилище записей (в памяти)
let bookings = [];

// Хранилище отзывов (в памяти - для демонстрации, в реальном приложении нужна БД)
let reviews = [];

const timeSlots = [
    '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00'
];

function getNext14Days() {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
        const current = new Date(today);
        current.setDate(today.getDate() + i);
        dates.push(current.toISOString().split('T')[0]);
    }
    return dates;
}

function generateSlotsStatusTable(allBookings) {
    let message = 'Текущий статус занятости:\n```\n';
    const dates = getNext14Days();

    // Создаем заголовок таблицы
    let header = 'Время';
    dates.forEach(date => {
        const d = new Date(date);
        header += ` | ${d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}`;
    });
    message += `${header}\n`;

    // Разделитель
    let separator = '------';
    dates.forEach(() => { separator += ' | -------'; });
    message += `${separator}\n`;

    // Заполняем строки для каждого временного слота
    timeSlots.forEach(slotTime => {
        let row = slotTime;
        dates.forEach(date => {
            const isBooked = allBookings.some(b => b.date === date && b.time === slotTime);
            row += ` | ${isBooked ? 'Занято' : 'Свободно'}`;
        });
        message += `${row}\n`;
    });

    message += '```';
    return message;
}

// Получить все записи
app.get('/bookings', (req, res) => {
    res.json(bookings);
});

// Получить все отзывы
app.get('/reviews', (req, res) => {
    res.json(reviews);
});

// Добавить новый отзыв
app.post('/review', (req, res) => {
    const { name, text, rating } = req.body;
    if (!name || !text || !rating) {
        return res.status(400).json({ error: 'Имя, текст и оценка обязательны' });
    }
    const newReview = { name, text, rating, timestamp: new Date().toISOString() };
    reviews.push(newReview);
    res.status(201).json({ success: true, review: newReview });
});

// Добавить новую запись
app.post('/book', async (req, res) => {
    const { name, phone, service, date, time, telegramUsername } = req.body;
    
    // Проверка на занятость конкретного времени
    const exists = bookings.find(b => b.date === date && b.time === time);
    if (exists) {
        return res.status(409).json({ error: 'Это время уже занято' });
    }

    const booking = { name, phone, service, date, time, telegramUsername };
    bookings.push(booking);

    // Формируем сообщение о новой записи для Telegram
    const newBookingMessage = `Новая запись:\n| Имя | Телефон | Ник Telegram | Услуга | Дата | Время |\n|---|---|---|---|---|---|\n| ${name} | ${phone} | ${telegramUsername} | ${service || 'не указана'} | ${date} | ${time} |`;

    // Формируем таблицу занятости
    const slotsStatusMessage = generateSlotsStatusTable(bookings);

    try {
        // Отправляем сообщение о новой записи
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: newBookingMessage,
            parse_mode: 'Markdown'
        });
        // Отправляем таблицу занятости
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: slotsStatusMessage,
            parse_mode: 'Markdown'
        });
    } catch (e) {
        console.error('Ошибка отправки в Telegram:', e.message);
    }
    res.json({ success: true });
});

// Удалить запись
app.delete('/bookings', (req, res) => {
    const { date, time } = req.body;
    const initialLength = bookings.length;
    bookings = bookings.filter(b => !(b.date === date && b.time === time));
    
    if (bookings.length === initialLength) {
        return res.status(404).json({ error: 'Запись не найдена' });
    }
    
    res.json({ success: true });
});

app.listen(process.env.PORT || PORT, () => {
    console.log(`Server started on http://localhost:${process.env.PORT || PORT}`);
}); 