# vlessbox

Веб-конвертер `vless://` ссылок в готовый конфиг [sing-box](https://sing-box.sagernet.org/) (схема 1.11+).

Вставляешь подписку или набор `vless://` ссылок — получаешь `config.json`, который можно скопировать или скачать. Парсинг и сборка конфига выполняются полностью в браузере, ничего не отправляется на сервер.

## Возможности

- Парсинг одной или нескольких `vless://` ссылок (в т.ч. base64-подписки)
- Поддержка транспортов: `tcp`, `ws`, `grpc`, `http/h2`, `httpupgrade`, `quic`
- TLS / Reality, early-data (`?ed=`)
- Копирование и скачивание готового `config.json`

## Стек

React 19 + Vite 6 + Tailwind CSS 4.

## Запуск

```bash
npm install
npm run dev      # или: make run
```

Дев-сервер поднимется на `http://localhost:5173`.

## Сборка

```bash
npm run build    # сборка в dist/
npm run preview  # локальный просмотр сборки
```

## Структура

```
src/
  App.jsx          UI: ввод ссылок, опции, вывод конфига
  lib/vless.js     парсинг vless:// в нормализованные узлы
  lib/singbox.js   сборка конфига sing-box из узлов
```
