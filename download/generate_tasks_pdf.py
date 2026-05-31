#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генерация PDF-документа: План доработки приложения «Швейное производство»
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

# ─── Palette ───────────────────────────────────────────────
ACCENT       = colors.HexColor('#5730c9')
TEXT_PRIMARY  = colors.HexColor('#191a1b')
TEXT_MUTED    = colors.HexColor('#797f85')
BG_SURFACE   = colors.HexColor('#e1e5e9')
BG_PAGE      = colors.HexColor('#e9ebed')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ─── Fonts ─────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-SemiBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-SemiBold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC-Bold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSC-Bold')
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')

# ─── Styles ────────────────────────────────────────────────
FONT_TITLE = 'SarasaMonoSC'
FONT_BODY  = 'NotoSerifSC'
FONT_BODY_BOLD = 'NotoSerifSC-Bold'
FONT_EN    = 'Carlito'

style_title = ParagraphStyle(
    name='DocTitle', fontName=FONT_TITLE, fontSize=24, leading=32,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=6
)
style_subtitle = ParagraphStyle(
    name='DocSubtitle', fontName=FONT_BODY, fontSize=13, leading=20,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=20
)
style_h1 = ParagraphStyle(
    name='H1', fontName=FONT_TITLE, fontSize=18, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10, wordWrap='CJK'
)
style_h2 = ParagraphStyle(
    name='H2', fontName=FONT_TITLE, fontSize=14, leading=22,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8, wordWrap='CJK'
)
style_h3 = ParagraphStyle(
    name='H3', fontName=FONT_BODY, fontSize=12, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6, wordWrap='CJK'
)
style_body = ParagraphStyle(
    name='Body', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=2, spaceAfter=4
)
style_body_just = ParagraphStyle(
    name='BodyJust', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, wordWrap='CJK',
    spaceBefore=2, spaceAfter=4
)
style_bullet = ParagraphStyle(
    name='Bullet', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    leftIndent=20, spaceBefore=1, spaceAfter=2
)
style_bullet2 = ParagraphStyle(
    name='Bullet2', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    leftIndent=40, spaceBefore=1, spaceAfter=2
)
style_table_header = ParagraphStyle(
    name='TableHeader', fontName=FONT_BODY, fontSize=10,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK'
)
style_table_cell = ParagraphStyle(
    name='TableCell', fontName=FONT_BODY, fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    leading=14
)
style_table_cell_c = ParagraphStyle(
    name='TableCellC', fontName=FONT_BODY, fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK',
    leading=14
)
style_critical = ParagraphStyle(
    name='Critical', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=colors.HexColor('#dc2626'), alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=2, spaceAfter=4
)
style_warning = ParagraphStyle(
    name='Warning', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=colors.HexColor('#d97706'), alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=2, spaceAfter=4
)
style_ok = ParagraphStyle(
    name='OK', fontName=FONT_BODY, fontSize=10.5, leading=18,
    textColor=colors.HexColor('#16a34a'), alignment=TA_LEFT, wordWrap='CJK',
    spaceBefore=2, spaceAfter=4
)

# ─── Helpers ───────────────────────────────────────────────
def h1(text):
    return Paragraph(f'<b>{text}</b>', style_h1)

def h2(text):
    return Paragraph(f'<b>{text}</b>', style_h2)

def h3(text):
    return Paragraph(f'<b>{text}</b>', style_h3)

def body(text):
    return Paragraph(text, style_body_just)

def bullet(text):
    return Paragraph(f'\u2022 {text}', style_bullet)

def bullet2(text):
    return Paragraph(f'\u2014 {text}', style_bullet2)

def critical(text):
    return Paragraph(f'\u26a0 {text}', style_critical)

def warning(text):
    return Paragraph(f'\u25b6 {text}', style_warning)

def ok(text):
    return Paragraph(f'\u2713 {text}', style_ok)

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with header and rows."""
    available_width = A4[0] - 2 * 1.2 * inch
    if col_ratios:
        col_widths = [r * available_width for r in col_ratios]
    else:
        n = len(headers)
        col_widths = [available_width / n] * n

    data = [[Paragraph(f'<b>{h}</b>', style_table_header) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) if i == 0
                     else Paragraph(str(c), style_table_cell_c)
                     for i, c in enumerate(row)])

    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ─── TOC Template ──────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

import hashlib

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

# ─── Build PDF ─────────────────────────────────────────────
OUTPUT = '/home/z/my-project/download/plan_dorabotki.pdf'

doc = TocDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=1.2*inch,
    rightMargin=1.2*inch,
    topMargin=1.0*inch,
    bottomMargin=1.0*inch,
)

story = []

# ════════════════════════════════════════════════════════════
# COVER PAGE
# ════════════════════════════════════════════════════════════
story.append(Spacer(1, 120))
story.append(Paragraph('<b>План доработки</b>', style_title))
story.append(Spacer(1, 8))
story.append(Paragraph('<b>приложения «Швейное производство»</b>', style_title))
story.append(Spacer(1, 24))
story.append(Paragraph('Анализ архитектуры, безопасности, качества кода и UX', style_subtitle))
story.append(Paragraph('с приоритизированным списком задач', style_subtitle))
story.append(Spacer(1, 36))
story.append(Paragraph('Стек: Next.js 16 + Prisma 6 + SQLite + Bun', style_subtitle))
story.append(Spacer(1, 8))
story.append(Paragraph('Дата: 31 мая 2026', style_subtitle))
story.append(PageBreak())

# ════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ════════════════════════════════════════════════════════════
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName=FONT_BODY, fontSize=12, leftIndent=20, leading=22, spaceBefore=6),
    ParagraphStyle(name='TOC2', fontName=FONT_BODY, fontSize=10.5, leftIndent=40, leading=18, spaceBefore=3),
]
story.append(Paragraph('<b>Содержание</b>', style_h1))
story.append(toc)
story.append(PageBreak())

# ════════════════════════════════════════════════════════════
# 1. ОБЩАЯ ОЦЕНКА ПРИЛОЖЕНИЯ
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>1. Общая оценка приложения</b>', style_h1, level=0))
story.append(Spacer(1, 6))

story.append(body(
    'Приложение представляет собой полнофункциональную платформу автоматизации швейного производства, '
    'охватывающую 10 взаимосвязанных модулей: планирование, раскрой, пошив, контроль качества, утюжка, '
    'распределение, упаковка, материалы, финансы и CRM. Доменная модель проработана детально, включены '
    'такие сложные механизмы, как поддержка комплектов (кит-продуктов), автосписание материалов при раскрое, '
    'авторасчёт норм, поштучный трекинг статусов с временными метками и расчёт зарплат. Это серьёзная '
    'и продуманная система, решающая реальные бизнес-задачи швейного предприятия.'
))

story.append(Spacer(1, 8))
story.append(body('Ниже представлена сводная оценка по ключевым направлениям:'))
story.append(Spacer(1, 8))

score_table = make_table(
    ['Категория', 'Оценка', 'Комментарий'],
    [
        ['Функциональность', '7/10', 'Основной поток работает; 3 роли-заглушки; финансы базовые'],
        ['Качество кода', '5/10', 'Хорошая структура, но any повсюду; нет тестов; дублирование'],
        ['Безопасность', '2/10', 'Подделка токена тривиальна; seed/print без авторизации'],
        ['Целостность данных', '4/10', 'Нет транзакций; race conditions; ручные каскадные удаления'],
        ['UX', '6/10', 'Функционально, но нет отмены, мобильной адаптации, уведомлений'],
        ['Производительность', '5/10', 'Нормально для малого масштаба; нет пагинации; SQLite'],
        ['Тестируемость', '0/10', 'Нет ни одного теста; не настроен фреймворк'],
    ],
    col_ratios=[0.22, 0.10, 0.68]
)
story.append(score_table)
story.append(Spacer(1, 18))

# ════════════════════════════════════════════════════════════
# 2. КРИТИЧЕСКИЕ ЗАДАЧИ (БЛОКЕРЫ)
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>2. Критические задачи (блокеры)</b>', style_h1, level=0))
story.append(Spacer(1, 6))
story.append(body(
    'Эти задачи требуют немедленного решения, поскольку они делают приложение уязвимым для атак '
    'и могут привести к потере или повреждению данных. Без их решения развивать функционал дальше '
    'нецелесообразно — любая продакшн-эксплуатация невозможна.'
))

# --- 2.1 ---
story.append(add_heading('<b>2.1. Починка аутентификации: верификация подписи JWT</b>', style_h2, level=1))
story.append(critical('Приоритет: P0 (блокер)'))
story.append(body(
    'Текущая реализация токена в файле src/lib/auth.ts создаёт JWT-подобную структуру из трёх частей '
    '(header.payload.signature), однако подпись представляет собой простую конкатенацию base64-строк, '
    'а функция verifyToken() только декодирует payload и никогда не проверяет подпись. Это означает, '
    'что любой злоумышленник может сформировать токен с произвольным userId и role (например, supervisor), '
    'и сервер примет его как легитимный.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Заменить кастомный JWT на библиотеку jsonwebtoken или jose'))
story.append(bullet('Использовать HMAC-SHA256 с секретом из JWT_SECRET для подписи'))
story.append(bullet('В verifyToken() проверять подпись перед декодированием payload'))
story.append(bullet('Убрать хранение токена в localStorage (оставить только httpOnly cookie)'))
story.append(bullet('Сгенерировать надёжный JWT_SECRET вместо дефолтного dev-secret-change-me'))
story.append(Spacer(1, 4))
story.append(h3('Файлы:'))
story.append(bullet('src/lib/auth.ts — основная реализация'))
story.append(bullet('src/components/auth-provider.tsx — убрать localStorage, оставить cookie'))

# --- 2.2 ---
story.append(add_heading('<b>2.2. Защита эндпоинтов seed и print</b>', style_h2, level=1))
story.append(critical('Приоритет: P0 (блокер)'))
story.append(body(
    'Эндпоинт GET /api/seed полностью удалает все данные из базы и создаёт пользователей '
    'с захардкоженными паролями (123456, admin) без какой-либо авторизации. Любой, кто знает URL, '
    'может уничтожить все данные одним запросом. Эндпоинт GET /api/print генерирует печатные формы '
    '(наряды на раскрой, пошив, упаковочные листы) также без авторизации, что даёт доступ '
    'к коммерческой информации о производстве.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить withAuth(["supervisor"]) на оба эндпоинта'))
story.append(bullet('В seed-эндпоинте дополнительно проверять NODE_ENV=development'))
story.append(bullet('Заменить захардкоженные пароли на генерацию случайных'))
story.append(bullet('Рассмотреть полное удаление seed-эндпоинта из продакшн-сборки'))
story.append(Spacer(1, 4))
story.append(h3('Файлы:'))
story.append(bullet('src/app/api/seed/route.ts'))
story.append(bullet('src/app/api/print/route.ts'))

# --- 2.3 ---
story.append(add_heading('<b>2.3. Починка сломанного эндпоинта /api/auth/session</b>', style_h2, level=1))
story.append(critical('Приоритет: P0 (блокер)'))
story.append(body(
    'Эндпоинт GET /api/auth/session читает cookie с именем "session", тогда как логин-эндпоинт '
    'устанавливает cookie с именем "token". Кроме того, session использует метод декодирования, '
    'отличный от verifyToken(). В результате эндпоинт всегда возвращает ошибку, и сессионная '
    'проверка не работает. Если какой-либо компонент пытается использовать этот эндпоинт '
    'для проверки авторизации, пользователь всегда будет считаться неавторизованным.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Изменить чтение cookie с "session" на "token"'))
story.append(bullet('Использовать verifyToken() вместо кастомного декодирования'))
story.append(bullet('Унифицировать все эндпоинты авторизации для использования одной функции проверки'))
story.append(Spacer(1, 4))
story.append(h3('Файлы:'))
story.append(bullet('src/app/api/auth/session/route.ts'))
story.append(bullet('src/app/api/auth/login/route.ts — сверить имя cookie'))

# --- 2.4 ---
story.append(add_heading('<b>2.4. Добавление транзакций в критические операции</b>', style_h2, level=1))
story.append(critical('Приоритет: P0 (блокер)'))
story.append(body(
    'Множественные операции записи в базу данных выполняются без транзакций. Если одна из операций '
    'в середине цепочки завершается ошибкой, предыдущие изменения остаются в базе, приводя '
    'к неконсистентному состоянию. Это особенно критично для операций одобрения плана (создание '
    'наряда на раскрой + обновление статуса), списания материалов, создания задач на пошив '
    'и удаления записей с каскадными зависимостями.'
))
story.append(Spacer(1, 4))
story.append(h3('Ключевые операции без транзакций:'))

tx_table = make_table(
    ['Операция', 'Файл', 'Риск при сбое'],
    [
        ['Одобрение плана', 'api/plans/[id]', 'План approved, но наряд на раскрой не создан'],
        ['Списание материалов', 'api/cutting-plans/[id]', 'Статус cut, но остатки не обновлены'],
        ['Создание задачи на пошив', 'api/sewing-tasks', 'Задача создана, а позиции — нет'],
        ['Удаление плана продаж', 'api/seller-plans/[id]', 'Часть позиций удалена, часть — нет'],
        ['Обновление остатков', 'api/material-entries', 'read-then-update race condition'],
    ],
    col_ratios=[0.30, 0.32, 0.38]
)
story.append(tx_table)
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Обернуть все мульти-записи в db.$transaction()'))
story.append(bullet('Для read-then-update — использовать $transaction с interactive transactions'))
story.append(bullet('Добавить обработку ошибок транзакций с откатом'))

# ════════════════════════════════════════════════════════════
# 3. ВЫСОКИЙ ПРИОРИТЕТ
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>3. Задачи высокого приоритета</b>', style_h1, level=0))
story.append(Spacer(1, 6))
story.append(body(
    'Эти задачи не блокируют работу приложения, но значительно влияют на его надёжность, '
    'поддерживаемость и безопасность данных. Их решение необходимо до выхода в продакшн.'
))

# --- 3.1 ---
story.append(add_heading('<b>3.1. Устранение TypeScript-антипаттернов</b>', style_h2, level=1))
story.append(warning('Приоритет: P1'))
story.append(body(
    'В конфигурации TypeScript установлено noImplicitAny: false и ignoreBuildErrors: true '
    'в next.config.ts. Это позволяет компилировать код с неявными типами any и скрывает '
    'ошибки типизации при сборке. В результате в коде повсеместно используются типы any '
    '(task: any, item: any, error: any), что полностью лишает TypeScript его основной ценности — '
    'статической проверки типов. Ошибки в типах обнаруживаются только в рантайме.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Установить noImplicitAny: true в tsconfig.json'))
story.append(bullet('Убрать ignoreBuildErrors: true из next.config.ts'))
story.append(bullet('Добавить reactStrictMode: true'))
story.append(bullet('Заменить все any на конкретные типы (Prisma генерирует их автоматически)'))
story.append(bullet('Для error — использовать тип unknown с type guard'))
story.append(bullet('Выполнять поэтапно: сначала включить strict, затем исправлять ошибки'))

# --- 3.2 ---
story.append(add_heading('<b>3.2. Добавление базового тестирования</b>', style_h2, level=1))
story.append(warning('Приоритет: P1'))
story.append(body(
    'В приложении нет ни одного теста. Не настроен тестовый фреймворк, нет конфигурации CI/CD. '
    'Любое изменение может сломать существующий функционал без какого-либо уведомления. '
    'Это особенно опасно учитывая сложную доменную логику с множеством статусных переходов '
    'и взаимозависимых операций (списание материалов, расчёт зарплат, формирование документов).'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Настроить Vitest как тестовый фреймворк (быстрый, совместим с Bun)'))
story.append(bullet('Написать unit-тесты для auth.ts (signToken, verifyToken, withAuth)'))
story.append(bullet('Написать unit-тесты для критических API-маршрутов (plans, sewing-tasks)'))
story.append(bullet('Настроить in-memory SQLite для тестовой БД'))
story.append(bullet('Добавить npm-скрипт test и pre-commit хук'))

# --- 3.3 ---
story.append(add_heading('<b>3.3. Унификация обработки ошибок</b>', style_h2, level=1))
story.append(warning('Приоритет: P1'))
story.append(body(
    'Каждый API-маршрут обрабатывает ошибки Prisma (P2002, P2025) inline без общей утилиты. '
    'Формат ответа не унифицирован: одни эндпоинты возвращают { error }, другие { message }. '
    'Клиентский api-client.ts проверяет оба поля. Ошибки логируются через console.error '
    'без структурирования и без возможности трассировки. Нет request ID для связывания '
    'клиентских и серверных логов.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Создать утилиту handleApiError(error) с маппингом Prisma-кодов'))
story.append(bullet('Унифицировать формат ответа: { error: string, code?: string }'))
story.append(bullet('Обновить api-client.ts для единого формата'))
story.append(bullet('Добавить генерацию request ID в proxy.ts/middleware'))
story.append(bullet('Рассмотреть структурированный логгер (pino/winston) вместо console.error'))

# --- 3.4 ---
story.append(add_heading('<b>3.4. Синхронизация статусов в Zod-схемах и Prisma</b>', style_h2, level=1))
story.append(warning('Приоритет: P1'))
story.append(body(
    'Обнаружено расхождение между статусами в Zod-схеме и Prisma-модели для CuttingLeftover. '
    'Zod определяет статусы: available, in_work, completed. Prisma-модель определяет: free, assigned, '
    'partially_sewn, fully_sewn. Это означает, что валидация на входе пропускает значения, '
    'которые не существуют в БД, и наоборот. Подобные расхождения могут существовать и для других '
    'моделей. Кроме того, логика статусных переходов дублируется между sewing-tasks/[id] и ironing/route.ts.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Провести аудит всех Zod-схем на соответствие Prisma-перечислениям'))
story.append(bullet('Создать единый источник истины для статусных переходов (state machine)'))
story.append(bullet('Вынести duplicated статус-логику в shared-модуль'))
story.append(bullet('Добавить типы PrismaEnum для автоматической синхронизации'))

# --- 3.5 ---
story.append(add_heading('<b>3.5. Валидация реквизитов (ИНН/КПП/БИК)</b>', style_h2, level=1))
story.append(warning('Приоритет: P1'))
story.append(body(
    'Поля ИНН, КПП, БИК и расчётный счёт хранятся как простой текст без валидации. '
    'Российский ИНН имеет контрольную цифру, которая позволяет обнаружить опечатку. '
    'КПП состоит из 9 цифр с определённой структурой. БИК — 9 цифр, начинающихся с 04. '
    'Расчётный счёт — 20 цифр с контрольной суммой, зависящей от БИК. Без валидации '
    'в базу попадают некорректные реквизиты, что делает невозможной генерацию корректных '
    'договоров, счетов и УПД, а также оплату по QR-коду.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить функцию validateINN() с проверкой контрольной цифры'))
story.append(bullet('Добавить валидацию КПП (9 цифр, структура)'))
story.append(bullet('Добавить валидацию БИК (9 цифр, начинается с 04)'))
story.append(bullet('Добавить валидацию расчётного счёта с контрольной суммой по БИК'))
story.append(bullet('Интегрировать валидацию в Zod-схемы (refine/superRefine)'))
story.append(bullet('Показывать понятные ошибки в UI при некорректных реквизитах'))

# ════════════════════════════════════════════════════════════
# 4. СРЕДНИЙ ПРИОРИТЕТ — ФУНКЦИОНАЛЬНЫЕ ПРОБЕЛЫ
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>4. Функциональные пробелы</b>', style_h1, level=0))
story.append(Spacer(1, 6))
story.append(body(
    'Эти задачи закрывают функциональные пробелы в текущей реализации. Они важны для полноценной '
    'работы пользователей, но не являются блокерами для базовой эксплуатации.'
))

# --- 4.1 ---
story.append(add_heading('<b>4.1. Реализация ролей Технолог, Расройщик, Продавец</b>', style_h2, level=1))
story.append(body(
    'Три роли из шести отображают экран-заглушку «В разработке». Роль «Технолог» должна управлять '
    'технологическими картами изделий, нормы расхода материалов и последовательность операций. '
    'Роль «Раскройщик» уже имеет API (cutting-plans), но не имеет собственного UI. '
    'Роль «Продавец» перенаправляет на «Производство» вместо отображения интерфейса '
    'отгрузки и работы с клиентами.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Раскройщик: создать dedicated UI с существующим API cutting-plans'))
story.append(bullet('Технолог: спроектировать и реализовать модуль технологических карт'))
story.append(bullet('Продавец: создать интерфейс отгрузки, связи с CRM и заказчиками'))

# --- 4.2 ---
story.append(add_heading('<b>4.2. Смена пароля пользователем</b>', style_h2, level=1))
story.append(body(
    'В системе отсутствует механизм смены пароля. Пользователи, созданные через seed-эндпоинт, '
    'получают захардкоженные пароли (123456, admin), которые невозможно сменить. Это означает, '
    'что все пользователи работают с известными паролями, что является серьёзной уязвимостью. '
    'Необходим как минимум функционал смены собственного пароля и сброса пароля администратором.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Создать API PATCH /api/auth/change-password'))
story.append(bullet('Добавить UI смены пароля в профиль пользователя'))
story.append(bullet('Добавить API PATCH /api/users/[id]/reset-password для супервизора'))
story.append(bullet('Принудить смену пароля при первом входе'))

# --- 4.3 ---
story.append(add_heading('<b>4.3. Пагинация и фильтрация списков</b>', style_h2, level=1))
story.append(body(
    'Все API-эндпоинты возвращают полные наборы данных без пагинации. При росте объёма данных '
    '(тысячи планов, десятки тысяч задач на пошив) это приведёт к медленной загрузке интерфейса, '
    'большому потреблению памяти на сервере и долгому рендерингу на клиенте. Только plans и sewing-tasks '
    'поддерживают query-параметры для фильтрации.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить пагинацию (cursor-based для Prisma) во все list-эндпоинты'))
story.append(bullet('Добавить параметры ?page=1&limit=50&search=&status='))
story.append(bullet('Обновить UI-компоненты для работы с пагинацией'))
story.append(bullet('Добавить индексы в Prisma-схему для часто фильтруемых полей'))

# --- 4.4 ---
story.append(add_heading('<b>4.4. Дашборд супервизора</b>', style_h2, level=1))
story.append(body(
    'Эндпоинт /api/stats существует и возвращает базовую статистику, однако в интерфейсе '
    'нет dedicated вкладки дашборда для супервизора. Супервизор видит сразу список планов, '
    'а не сводку состояния производства. Для эффективного управления необходим обзорный экран '
    'с ключевыми метриками: количество заказов в работе, просроченные задачи, загрузка '
    'швей, остатки материалов и финансовые показатели.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Создать вкладку «Дашборд» как стартовый экран супервизора'))
story.append(bullet('Показать KPI-карточки: заказы в работе, просрочки, загрузка, финансы'))
story.append(bullet('Добавить графики трендов (выполнение по дням/неделям)'))
story.append(bullet('Добавить алерты для критических ситуаций'))

# --- 4.5 ---
story.append(add_heading('<b>4.5. Подтверждение деструктивных действий</b>', style_h2, level=1))
story.append(body(
    'Удаление планов, сотрудников, коробок и других сущностей выполняется без подтверждения. '
    'Случайный клик по кнопке удаления приводит к необратимой потере данных. Нет механизма '
    'отмены (undo), нет soft-delete, нет аудита изменений. Для производственной системы это '
    'критический UX-пробел, который может привести к потере важных данных.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить диалог подтверждения на все delete-операции'))
story.append(bullet('Реализовать soft-delete (поле deletedAt в моделях)'))
story.append(bullet('Добавить логирование изменений (audit log)'))
story.append(bullet('Реализовать корзину с восстановлением удалённых записей'))

# --- 4.6 ---
story.append(add_heading('<b>4.6. Загрузка изображений продуктов</b>', style_h2, level=1))
story.append(body(
    'В модели Product существует поле imageUrl, однако не реализован механизм загрузки изображений. '
    'Для швейного производства визуальное представление изделия критически важно — без фотографий '
    'или эскизов сложно идентифицировать продукт при планировании, раскрое и пошиве. '
    'В package.json указана зависимость sharp, но она не используется.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Создать API POST /api/upload для загрузки изображений'))
story.append(bullet('Использовать sharp для оптимизации и создания миниатюр'))
story.append(bullet('Добавить UI загрузки в карточку продукта'))
story.append(bullet('Хранить файлы локально с возможностью миграции на S3'))

# ════════════════════════════════════════════════════════════
# 5. СРЕДНИЙ ПРИОРИТЕТ — UX И КАЧЕСТВО
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>5. Улучшения UX и качества</b>', style_h1, level=0))
story.append(Spacer(1, 6))

# --- 5.1 ---
story.append(add_heading('<b>5.1. Мобильная адаптация</b>', style_h2, level=1))
story.append(body(
    'Текущий интерфейс не адаптирован для мобильных устройств. Вертикальный сайдбар и сеточные '
    'макеты плохо работают на экранах шириной менее 768px. Для производственной среды, где '
    'сотрудники могут использовать планшеты или телефоны для доступа к системе (например, '
    'швея отмечает выполненную задачу со смартфона), мобильная адаптация необходима.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить hamburger-меню для мобильных экранов'))
story.append(bullet('Адаптировать табличные представления для узких экранов'))
story.append(bullet('Протестировать ключевые сценарии на 375px и 768px'))

# --- 5.2 ---
story.append(add_heading('<b>5.2. Уведомления о статусных изменениях</b>', style_h2, level=1))
story.append(body(
    'Пользователи не получают уведомлений об изменениях статусов. Швея не узнаёт о новой задаче, '
    'контролёр ОТК не видит поступления на проверку, супервизор не информирован о завершении '
    'заказа. Все изменения обнаруживаются только при ручном обновлении страницы. '
    'React Query автоматически обновляет данные с staleTime=60s, но это не уведомляет пользователя.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить WebSocket/SSE для real-time обновлений'))
story.append(bullet('Реализовать toast-уведомления при статусных переходах'))
story.append(bullet('Добавить счётчик непросмотренных событий в сайдбаре'))

# --- 5.3 ---
story.append(add_heading('<b>5.3. Экспорт данных</b>', style_h2, level=1))
story.append(body(
    'Отсутствует функционал экспорта данных в форматы Excel/CSV. Для производственного учёта '
    'возможность выгрузки отчётов по зарплатам, выполненным заказам, остаткам материалов '
    'и финансовым показателям является обязательной. Бухгалтерия и менеджмент работают '
    'с Excel-файлами, и ручной перенос данных из веб-интерфейса неэффективен.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить API GET /api/export?format=xlsx&type=salary'))
story.append(bullet('Использовать библиотеку xlsx/exceljs для генерации'))
story.append(bullet('Добавить кнопки экспорта в ключевые табличные представления'))

# --- 5.4 ---
story.append(add_heading('<b>5.4. Очистка неиспользуемых зависимостей</b>', style_h2, level=1))
story.append(body(
    'В package.json числится 80+ зависимостей, из которых значительная часть не используется '
    'в исходном коде: next-auth, next-intl, framer-motion, qrcode, docx, zustand, react-markdown, '
    'react-syntax-highlighter, sharp, uuid, z-ai-web-dev-sdk. Каждая неиспользуемая зависимость '
    'увеличивает размер node_modules, замедляет установку и сборку, а также создаёт потенциальные '
    'уязвимости безопасности.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Провести аудит с помощью depcheck'))
story.append(bullet('Удалить неиспользуемые зависимости'))
story.append(bullet('Заместить qrcode (уже генерирует QR) — проверить использование'))
story.append(bullet('Оставить sharp если планируется загрузка изображений'))

# --- 5.5 ---
story.append(add_heading('<b>5.5. Удаление модели Task (legacy)</b>', style_h2, level=1))
story.append(body(
    'В Prisma-схеме осталась модель Task от старой системы задач. Seed-эндпоинт создаёт записи '
    'в этой таблице, но реальная система использует SewingTask/SewingTaskItem. Наличие устаревшей '
    'модели загрязняет схему, создаёт путаницу и может приводить к ошибкам при разработке. '
    'API /api/tasks также является legacy и должен быть удалён после миграции.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Убедиться, что Task нигде не используется в UI'))
story.append(bullet('Удалить модель Task из schema.prisma'))
story.append(bullet('Удалить /api/tasks route'))
story.append(bullet('Удалить создание Task из seed-эндпоинта'))
story.append(bullet('Применить миграцию'))

# ════════════════════════════════════════════════════════════
# 6. НИЗКИЙ ПРИОРИТЕТ — ОПТИМИЗАЦИЯ
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>6. Оптимизация и масштабируемость</b>', style_h1, level=0))
story.append(Spacer(1, 6))

# --- 6.1 ---
story.append(add_heading('<b>6.1. Оптимизация N+1 запросов</b>', style_h2, level=1))
story.append(body(
    'Ряд API-эндпоинтов выполняет запросы к базе данных в цикле, что создаёт проблему N+1. '
    'Например, при обновлении наряда на раскрой каждая позиция обновляется отдельным запросом. '
    'Расчёт доступных позиций для распределения загружает все задачи на пошив и все планы продаж '
    'полностью. С ростом объёма данных это приведёт к значительному замедлению.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Заменить циклы с individual DB calls на batch operations'))
story.append(bullet('Использовать Prisma updateMany/createMany для массовых операций'))
story.append(bullet('Оптимизировать запрос available-items через агрегацию на уровне БД'))

# --- 6.2 ---
story.append(add_heading('<b>6.2. Стратегия миграции с SQLite</b>', style_h2, level=1))
story.append(body(
    'SQLite поддерживает только одного писателя одновременно. При одновременных запросах на запись '
    '(например, несколько швей одновременно отмечают выполнение задач) база данных блокируется, '
    'и запросы ставятся в очередь. Для одного-двух пользователей это не проблема, но при росте '
    'количества одновременных пользователей система станет медленной и начнёт выдавать ошибки '
    'SQLITE_BUSY. Кроме того, absolute path в DATABASE_URL (/home/z/my-project/db/custom.db) '
    'может не работать при деплое с output: standalone.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('На ближайшем этапе: добавить WAL-режим и настройки busy_timeout'))
story.append(bullet('Среднесрочно: подготовить миграцию на PostgreSQL'))
story.append(bullet('Использовать относительный путь для DATABASE_URL'))

# --- 6.3 ---
story.append(add_heading('<b>6.3. Добавление индексов в Prisma-схему</b>', style_h2, level=1))
story.append(body(
    'В текущей схеме Prisma отсутствуют явные индексы для часто используемых полей фильтрации '
    'и сортировки: статус задач, дата создания, идентификатор сотрудника, идентификатор плана. '
    'По мере роста объёма данных запросы без индексов будут выполняться всё медленнее. '
    'Prisma позволяет объявлять индексы декларативно, и их добавление не требует изменения логики.'
))
story.append(Spacer(1, 4))
story.append(h3('Что сделать:'))
story.append(bullet('Добавить @@index на поля status во всех моделях'))
story.append(bullet('Добавить @@index на createdAt для сортировки по дате'))
story.append(bullet('Добавить @@index на employeeId, planId для фильтрации'))
story.append(bullet('Создать миграцию и проверить скорость запросов'))

# ════════════════════════════════════════════════════════════
# 7. СВОДНАЯ ТАБЛИЦА ЗАДАЧ
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>7. Сводная таблица задач</b>', style_h1, level=0))
story.append(Spacer(1, 8))

summary_rows = [
    ['2.1', 'P0', 'Верификация подписи JWT', 'auth.ts'],
    ['2.2', 'P0', 'Защита seed и print', 'api/seed, api/print'],
    ['2.3', 'P0', 'Починка /api/auth/session', 'api/auth/session'],
    ['2.4', 'P0', 'Добавление транзакций', 'plans, cutting, sewing'],
    ['3.1', 'P1', 'Устранение any и ignoreBuildErrors', 'tsconfig, next.config'],
    ['3.2', 'P1', 'Базовое тестирование (Vitest)', 'auth, API routes'],
    ['3.3', 'P1', 'Унификация обработки ошибок', 'все API routes'],
    ['3.4', 'P1', 'Синхронизация Zod и Prisma статусов', 'schemas, models'],
    ['3.5', 'P1', 'Валидация ИНН/КПП/БИК', 'schemas, references'],
    ['4.1', 'P2', 'Реализация ролей (Технолог и др.)', 'UI components'],
    ['4.2', 'P2', 'Смена пароля пользователем', 'auth, UI'],
    ['4.3', 'P2', 'Пагинация и фильтрация', 'API, UI'],
    ['4.4', 'P2', 'Дашборд супервизора', 'stats, UI'],
    ['4.5', 'P2', 'Подтверждение удаления', 'UI, soft-delete'],
    ['4.6', 'P2', 'Загрузка изображений', 'upload, sharp'],
    ['5.1', 'P2', 'Мобильная адаптация', 'CSS, layout'],
    ['5.2', 'P2', 'Уведомления', 'WebSocket/SSE'],
    ['5.3', 'P2', 'Экспорт в Excel/CSV', 'export API'],
    ['5.4', 'P3', 'Очистка зависимостей', 'package.json'],
    ['5.5', 'P3', 'Удаление legacy Task', 'schema, routes'],
    ['6.1', 'P3', 'Оптимизация N+1 запросов', 'API routes'],
    ['6.2', 'P3', 'Подготовка к миграции на PostgreSQL', 'database'],
    ['6.3', 'P3', 'Добавление индексов', 'schema.prisma'],
]

summary_table = make_table(
    ['#', 'Приоритет', 'Задача', 'Затронутые модули'],
    summary_rows,
    col_ratios=[0.06, 0.10, 0.50, 0.34]
)
story.append(summary_table)
story.append(Spacer(1, 18))

# ════════════════════════════════════════════════════════════
# 8. РЕКОМЕНДУЕМЫЙ ПОРЯДОК РЕАЛИЗАЦИИ
# ════════════════════════════════════════════════════════════
story.append(add_heading('<b>8. Рекомендуемый порядок реализации</b>', style_h1, level=0))
story.append(Spacer(1, 6))

story.append(h2('Спринт 1 — Безопасность (1-2 недели)'))
story.append(bullet('2.1 Починка JWT-верификации'))
story.append(bullet('2.2 Защита seed и print'))
story.append(bullet('2.3 Починка /api/auth/session'))
story.append(bullet('2.4 Добавление транзакций в критические операции'))
story.append(bullet('3.5 Валидация ИНН/КПП/БИК'))
story.append(Spacer(1, 10))

story.append(h2('Спринт 2 — Качество (1-2 недели)'))
story.append(bullet('3.1 Устранение TypeScript-антипаттернов'))
story.append(bullet('3.2 Настройка Vitest + тесты auth'))
story.append(bullet('3.3 Унификация обработки ошибок'))
story.append(bullet('3.4 Синхронизация Zod и Prisma'))
story.append(bullet('5.4 Очистка зависимостей'))
story.append(bullet('5.5 Удаление legacy Task'))
story.append(Spacer(1, 10))

story.append(h2('Спринт 3 — Функциональность (2-3 недели)'))
story.append(bullet('4.2 Смена пароля'))
story.append(bullet('4.5 Подтверждение удаления + soft-delete'))
story.append(bullet('4.3 Пагинация и фильтрация'))
story.append(bullet('4.4 Дашборд супервизора'))
story.append(bullet('4.6 Загрузка изображений'))
story.append(Spacer(1, 10))

story.append(h2('Спринт 4 — Роли и UX (2-3 недели)'))
story.append(bullet('4.1 Реализация ролей (Раскройщик, Технолог, Продавец)'))
story.append(bullet('5.1 Мобильная адаптация'))
story.append(bullet('5.2 Уведомления'))
story.append(bullet('5.3 Экспорт данных'))
story.append(Spacer(1, 10))

story.append(h2('Спринт 5 — Оптимизация (1-2 недели)'))
story.append(bullet('6.1 Оптимизация N+1 запросов'))
story.append(bullet('6.2 WAL-режим SQLite + подготовка к PostgreSQL'))
story.append(bullet('6.3 Добавление индексов'))

# ─── Build ─────────────────────────────────────────────────
doc.multiBuild(story)
print(f'PDF saved to: {OUTPUT}')
