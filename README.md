# GDS → AA Booking Link Generator

Веб-приложение для парсинга строк Sabre GDS (availability / itinerary) и генерации deep-link'ов American Airlines (`aa.com/goto/metasearch`).

## Возможности

- Вставка строк Sabre (формат `*IA` / itinerary)
- Автоматический парсинг carrier, flight number, class, cities, times, dates
- Редактирование сегментов (cabin, fare basis, new direction)
- Генерация ссылки AA metasearch
- Копирование / открытие ссылки

## Локальный запуск

```bash
cd gds-linker
npm install
npm run dev
```

Открой http://localhost:3000

## Деплой на Vercel

1. Залей репозиторий на GitHub
2. Зайди на [vercel.com](https://vercel.com) → New Project → Import
3. Framework: Next.js (определится автоматически)
4. Deploy

Или через CLI:

```bash
npm i -g vercel
vercel
```

## Пример строк для теста

```
1 AA 763I 31DEC Q MUCCLT*SS2 1020A 245P /DCAA /E
2 AA2305I 31DEC Q CLTDEN*SS2 456P 635P /DCAA /E
3 BA 176O 30JAN J JFKLHR*SS2 705P 705A 31JAN S /DCBA /E
4 BA 396O 31JAN S LHRCAI*SS2 855A 355P /DCBA /E
```

## Примечания

- Генератор ссылки построен по reverse-engineering публичных примеров AA.
- Если ссылка не открывает нужный маршрут — проверь даты/время в сегментах и флаг `new dir`.
- Price / currency / rate пока информативные (в текущей версии ITEN их не всегда использует).
- Можно расширять под другие авиакомпании (UA, BA, LH и т.д.).
