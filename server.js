const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Замените на свой токен и chat_id
const TELEGRAM_BOT_TOKEN = '8025673149:AAF-DoHcIIfpwFB23FVZWqFxWk98isN96dI';
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

// Получить все отзывы (только одобренные)
app.get('/reviews', (req, res) => {
    const approvedReviews = reviews.filter(review => review.status === 'approved');
    res.json(approvedReviews);
});

// Добавить новый отзыв
app.post('/review', async (req, res) => {
    const { name, text, rating } = req.body;
    if (!name || !text || !rating) {
        return res.status(400).json({ error: 'Имя, текст и оценка обязательны' });
    }

    const newReview = { 
        id: Date.now().toString(),
        name, 
        text, 
        rating, 
        timestamp: new Date().toISOString(),
        status: 'pending', // pending, approved, rejected
        reply: null
    };
    reviews.push(newReview);

    // Формируем сообщение о новом отзыве для Telegram
    const reviewMessage = `*Новый отзыв:*\n\n` +
        `👤 Имя: ${name}\n` +
        `⭐ Оценка: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}\n` +
        `📝 Текст: ${text}\n\n` +
        `Для одобрения: /approve_${newReview.id}\n` +
        `Для отклонения: /reject_${newReview.id}`;

    try {
        // Отправляем сообщение о новом отзыве
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: reviewMessage,
            parse_mode: 'Markdown'
        });
    } catch (e) {
        console.error('Ошибка отправки отзыва в Telegram:', e.message);
    }

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
    const newBookingMessage = `*Новая запись:*\n\n` +
        `👤 Имя: ${name}\n` +
        `📱 Телефон: ${phone}\n` +
        `📲 Telegram: ${telegramUsername || 'не указан'}\n` +
        `💅 Услуга: ${service || 'не указана'}\n` +
        `📅 Дата: ${date}\n` +
        `⏰ Время: ${time}`;

    // Формируем таблицу занятости
    const slotsStatusMessage = generateSlotsStatusTable(bookings);

    try {
        console.log('Отправка сообщения в Telegram...');
        console.log('Токен бота:', TELEGRAM_BOT_TOKEN);
        console.log('Chat ID:', TELEGRAM_CHAT_ID);
        
        // Отправляем сообщение о новой записи
        const bookingResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: newBookingMessage,
            parse_mode: 'Markdown'
        });
        console.log('Ответ от Telegram (запись):', bookingResponse.data);

        // Отправляем таблицу занятости
        const statusResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: slotsStatusMessage,
            parse_mode: 'Markdown'
        });
        console.log('Ответ от Telegram (статус):', statusResponse.data);
    } catch (e) {
        console.error('Ошибка отправки в Telegram:', e.message);
        if (e.response) {
            console.error('Ответ от Telegram API:', e.response.data);
        }
    }
    res.json({ success: true });
});

// Удалить запись
app.delete('/bookings', (req, res) => {
    const { date, time } = req.body;
    console.log(`Попытка удалить запись: Дата = ${date}, Время = ${time}`);
    const initialLength = bookings.length;
    bookings = bookings.filter(b => !(b.date === date && b.time === time));
    
    if (bookings.length === initialLength) {
        return res.status(404).json({ error: 'Запись не найдена' });
    }
    
    res.json({ success: true });
});

// Ответить на отзыв (только для админа)
app.post('/review/:id/reply', async (req, res) => {
    const { id } = req.params;
    const { reply } = req.body;
    
    const review = reviews.find(r => r.id === id);
    if (!review) {
        return res.status(404).json({ error: 'Отзыв не найден' });
    }

    review.reply = reply;
    review.replyTimestamp = new Date().toISOString();

    // Отправляем уведомление об ответе
    const replyMessage = `*Ответ на отзыв:*\n\n` +
        `👤 Отзыв от: ${review.name}\n` +
        `⭐ Оценка: ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}\n` +
        `📝 Текст отзыва: ${review.text}\n\n` +
        `💬 Ответ: ${reply}`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: replyMessage,
            parse_mode: 'Markdown'
        });
    } catch (e) {
        console.error('Ошибка отправки ответа в Telegram:', e.message);
    }

    res.json({ success: true, review });
});

app.listen(process.env.PORT || PORT, () => {
    console.log(`Server started on http://localhost:${process.env.PORT || PORT}`);
});